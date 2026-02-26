import { NextResponse } from 'next/server';
import { spawn, exec } from 'child_process';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ── In-memory state for pending flows ──
interface PendingFlow {
    provider: string;
    type: 'install' | 'auth';
    status: 'pending' | 'success' | 'error';
    error?: string;
    createdAt: number;
    pid?: number;
}

const pendingFlows = new Map<string, PendingFlow>();

function cleanupStale() {
    const now = Date.now();
    for (const [id, flow] of pendingFlows) {
        if (now - flow.createdAt > 10 * 60 * 1000) {
            pendingFlows.delete(id);
        }
    }
}

function checkInstalled(cmd: string): Promise<boolean> {
    return new Promise((resolve) => {
        exec(`which ${cmd}`, (err) => resolve(!err));
    });
}

function checkGeminiAuthed(): boolean {
    const credsPath = join(homedir(), '.gemini', 'oauth_creds.json');
    return existsSync(credsPath);
}

function checkCodexAuthed(): Promise<boolean> {
    return new Promise((resolve) => {
        // Codex stores auth in ~/.codex/ or checks via `codex login --status`
        const configDir = join(homedir(), '.codex');
        if (existsSync(join(configDir, 'auth.json'))) {
            resolve(true);
            return;
        }
        // Also check for OPENAI_API_KEY env var as fallback
        if (process.env.OPENAI_API_KEY) {
            resolve(true);
            return;
        }
        resolve(false);
    });
}

// Install packages
const INSTALL_PACKAGES: Record<string, string> = {
    'gemini-cli': '@google/gemini-cli',
    'codex': '@openai/codex',
};

// POST /api/auth/cli
export async function POST(request: Request) {
    try {
        cleanupStale();
        const { provider, action } = await request.json();

        if (!['gemini-cli', 'codex'].includes(provider)) {
            return NextResponse.json({ error: 'Invalid CLI provider' }, { status: 400 });
        }

        const cliCommand = provider === 'gemini-cli' ? 'gemini' : 'codex';
        const isInstalled = await checkInstalled(cliCommand);
        const flowId = randomBytes(16).toString('hex');

        // ── INSTALL ──
        if (action === 'install') {
            if (isInstalled) {
                return NextResponse.json({ alreadyInstalled: true });
            }

            const pkg = INSTALL_PACKAGES[provider];
            const flow: PendingFlow = {
                provider, type: 'install', status: 'pending',
                createdAt: Date.now(),
            };
            pendingFlows.set(flowId, flow);

            const child = spawn('npm', ['install', '-g', pkg], {
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true,
                detached: false,
            });

            child.on('close', (code) => {
                flow.status = code === 0 ? 'success' : 'error';
                if (code !== 0) flow.error = `npm install exited with code ${code}`;
            });
            child.on('error', (err) => {
                flow.status = 'error';
                flow.error = err.message;
            });

            return NextResponse.json({ flowId, action: 'install' });
        }

        // ── AUTH ──
        if (action === 'auth') {
            if (!isInstalled) {
                return NextResponse.json({ notInstalled: true }, { status: 400 });
            }

            if (provider === 'gemini-cli') {
                // Gemini CLI: auth happens on first run. We run `gemini --version`
                // as a quick test, then check if oauth_creds.json exists.
                // If already authed, just confirm. If not, run `gemini` with a
                // harmless prompt that forces auth, then immediately kill it.

                if (checkGeminiAuthed()) {
                    return NextResponse.json({ alreadyAuthed: true });
                }

                // Not authed — spawn gemini with output format to force auth flow
                // then kill after a short time. The auth prompt will open the browser.
                const flow: PendingFlow = {
                    provider, type: 'auth', status: 'pending',
                    createdAt: Date.now(),
                };
                pendingFlows.set(flowId, flow);

                const child = spawn('gemini', ['--version'], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false,
                });

                flow.pid = child.pid;

                // Monitor for auth file creation
                const checkInterval = setInterval(() => {
                    if (checkGeminiAuthed()) {
                        clearInterval(checkInterval);
                        flow.status = 'success';
                        try { child.kill(); } catch { }
                    }
                }, 1000);

                child.on('close', () => {
                    clearInterval(checkInterval);
                    if (checkGeminiAuthed()) {
                        flow.status = 'success';
                    } else if (flow.status === 'pending') {
                        flow.status = 'error';
                        flow.error = 'Gemini CLI exited without completing authentication.';
                    }
                });

                child.on('error', (err) => {
                    clearInterval(checkInterval);
                    flow.status = 'error';
                    flow.error = err.message;
                });

                // Safety timeout: kill after 3 minutes
                setTimeout(() => {
                    clearInterval(checkInterval);
                    try { child.kill(); } catch { }
                    if (flow.status === 'pending') {
                        flow.status = 'error';
                        flow.error = 'Auth timed out.';
                    }
                }, 3 * 60 * 1000);

                return NextResponse.json({ flowId, action: 'auth' });

            } else {
                // Codex CLI: has a real `login` subcommand
                if (await checkCodexAuthed()) {
                    return NextResponse.json({ alreadyAuthed: true });
                }

                const flow: PendingFlow = {
                    provider, type: 'auth', status: 'pending',
                    createdAt: Date.now(),
                };
                pendingFlows.set(flowId, flow);

                const child = spawn('codex', ['login'], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false,
                });

                flow.pid = child.pid;

                child.on('close', (code) => {
                    flow.status = code === 0 ? 'success' : 'error';
                    if (code !== 0) flow.error = `codex login exited with code ${code}`;
                });

                child.on('error', (err) => {
                    flow.status = 'error';
                    flow.error = err.message;
                });

                // Safety timeout
                setTimeout(() => {
                    try { child.kill(); } catch { }
                    if (flow.status === 'pending') {
                        flow.status = 'error';
                        flow.error = 'Auth timed out.';
                    }
                }, 3 * 60 * 1000);

                return NextResponse.json({ flowId, action: 'auth' });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET /api/auth/cli — Poll status or check install/auth state
export async function GET(request: Request) {
    const url = new URL(request.url);

    // Check if CLI is installed
    const checkProvider = url.searchParams.get('check');
    if (checkProvider) {
        const cmd = checkProvider === 'gemini-cli' ? 'gemini' : 'codex';
        const installed = await checkInstalled(cmd);
        let authed = false;
        if (installed) {
            authed = checkProvider === 'gemini-cli'
                ? checkGeminiAuthed()
                : await checkCodexAuthed();
        }
        return NextResponse.json({ installed, authed });
    }

    // Poll flow status
    const flowId = url.searchParams.get('flowId');
    if (!flowId || !pendingFlows.has(flowId)) {
        return NextResponse.json({ status: 'unknown' });
    }

    const flow = pendingFlows.get(flowId)!;
    const response: any = { status: flow.status, type: flow.type };
    if (flow.status === 'error') response.error = flow.error;

    if (flow.status !== 'pending') {
        setTimeout(() => pendingFlows.delete(flowId), 10000);
    }

    return NextResponse.json(response);
}
