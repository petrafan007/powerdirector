// @ts-nocheck
import { IncomingMessage } from 'node:http';
import { platform } from 'node:os';
import { existsSync } from 'node:fs';
import { WebSocket, WebSocketServer } from 'ws';

export type TerminalShell = 'bash' | 'zsh';

export interface TerminalRuntimeOptions {
    shell?: TerminalShell;
    autoTimeoutMinutes?: number;
    port?: number;
    bind?: 'auto' | 'lan' | 'loopback' | 'custom' | 'tailnet';
}

interface TerminalSession {
    pty: any; // Using any to avoid IPty type dependency
    ws: WebSocket | null;
    idleTimeoutMs: number;
    lastActivityAt: number;
    atPrompt: boolean;
    tailBuffer: string;
    timeoutInterval?: NodeJS.Timeout;
}

const ANSI_RE = /\x1B\[[0-9;?]*[ -/]*[@-~]/g;
const PROMPT_RE = /(?:^|\n)[^\n\r]{0,160}(?:[$%#]) ?$/;
const BRACKETED_PASTE_ENABLE = '\x1b[?2004h';
const BRACKETED_PASTE_DISABLE = '\x1b[?2004l';

function stripAnsi(input: string): string {
    return input.replace(ANSI_RE, '');
}

function parseQueryInt(value: string | null): number | undefined {
    if (typeof value !== 'string' || value.trim().length === 0) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return Math.floor(parsed);
}

function normalizeTimeoutMs(minutes: number | undefined): number {
    if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return 10 * 60 * 1000;
    const clamped = Math.max(0, Math.min(Math.floor(minutes), 1440));
    return clamped * 60 * 1000;
}

function parseRequestUrl(req?: IncomingMessage): URL | null {
    try {
        if (!req?.url) return null;
        return new URL(req.url, 'http://127.0.0.1');
    } catch {
        return null;
    }
}

export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();
    private wss: WebSocketServer | null = null;
    private readonly port: number;
    private readonly runtimeOptionsProvider?: () => TerminalRuntimeOptions;

    constructor(port: number = 3008, runtimeOptionsProvider?: () => TerminalRuntimeOptions) {
        this.port = port;
        this.runtimeOptionsProvider = runtimeOptionsProvider;
    }

    private getPty() {
        try {
            return require('node-pty');
        } catch (e) {
            console.error('[TerminalManager] Failed to load node-pty:', e);
            throw new Error('Terminal support (node-pty) not available.');
        }
    }

    private resolveRuntimeOptions(req?: IncomingMessage): TerminalRuntimeOptions {
        let shellFromQuery: TerminalShell | undefined;
        let timeoutFromQuery: number | undefined;

        const url = parseRequestUrl(req);
        if (url) {
            const shellParam = url.searchParams.get('shell');
            if (shellParam === 'bash' || shellParam === 'zsh') {
                shellFromQuery = shellParam;
            }
            timeoutFromQuery = parseQueryInt(url.searchParams.get('autoTimeoutMinutes'));
        }

        const base = this.runtimeOptionsProvider ? (this.runtimeOptionsProvider() || {}) : {};
        return {
            ...base,
            shell: shellFromQuery ?? base.shell,
            autoTimeoutMinutes: timeoutFromQuery ?? base.autoTimeoutMinutes
        };
    }

    private resolveRequestedSessionId(req?: IncomingMessage): string | undefined {
        const url = parseRequestUrl(req);
        if (!url) return undefined;
        const raw = url.searchParams.get('sessionId');
        if (!raw || raw.trim().length === 0) return undefined;
        return raw.trim();
    }

    private resolveShellExecutable(shell: TerminalShell | undefined): string {
        if (platform() === 'win32') {
            return 'powershell.exe';
        }

        const preferred = shell === 'bash' ? 'bash' : 'zsh';
        const candidates = preferred === 'zsh'
            ? ['/bin/zsh', '/usr/bin/zsh', 'zsh', '/bin/bash', '/usr/bin/bash', 'bash']
            : ['/bin/bash', '/usr/bin/bash', 'bash', '/bin/zsh', '/usr/bin/zsh', 'zsh'];

        for (const candidate of candidates) {
            if (candidate.includes('/')) {
                if (existsSync(candidate)) return candidate;
                continue;
            }
            return candidate;
        }

        return 'bash';
    }

    private parseResizeMessage(msg: string): { cols: number; rows: number } | null {
        if (!msg.startsWith('resize:')) return null;
        const parts = msg.slice(7).split(',');
        const cols = Number(parts[0]);
        const rows = Number(parts[1]);
        if (!Number.isFinite(cols) || !Number.isFinite(rows)) return null;
        const normalizedCols = Math.max(20, Math.floor(cols));
        const normalizedRows = Math.max(5, Math.floor(rows));
        return { cols: normalizedCols, rows: normalizedRows };
    }

    private updatePromptState(session: TerminalSession, rawData: string): void {
        // Prefer bracketed-paste mode toggles from interactive shells.
        // They are emitted when the shell returns to prompt (enable) and when
        // command input starts executing (disable), including themed zsh prompts.
        const enableIdx = rawData.lastIndexOf(BRACKETED_PASTE_ENABLE);
        const disableIdx = rawData.lastIndexOf(BRACKETED_PASTE_DISABLE);
        const sawPromptToggle = enableIdx !== -1 || disableIdx !== -1;
        if (sawPromptToggle) {
            session.atPrompt = enableIdx > disableIdx;
        }

        const sanitized = stripAnsi(rawData).replace(/\r/g, '');
        if (sanitized.length === 0) return;

        session.tailBuffer = (session.tailBuffer + sanitized).slice(-512);
        if (!sawPromptToggle && PROMPT_RE.test(session.tailBuffer)) {
            session.atPrompt = true;
            return;
        }

        if (!sawPromptToggle && /[^\s]/.test(sanitized)) {
            session.atPrompt = false;
        }
    }

    private clearSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        if (session.timeoutInterval) clearInterval(session.timeoutInterval);
        session.ws = null;
        this.sessions.delete(sessionId);
    }

    private startTimeoutWatcher(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session || session.idleTimeoutMs <= 0) return;

        session.timeoutInterval = setInterval(() => {
            const current = this.sessions.get(sessionId);
            if (!current) return;
            if (!current.atPrompt) return;

            const idleFor = Date.now() - current.lastActivityAt;
            if (idleFor < current.idleTimeoutMs) return;

            if (current.ws && current.ws.readyState === WebSocket.OPEN) {
                current.ws.send('\r\n\x1b[33m[PowerDirector] Session closed due to idle timeout.\x1b[0m\r\n');
            }
            this.closeSession(sessionId, 4000, 'idle-timeout');
            console.log(`[TerminalManager] Session ${sessionId} closed by idle timeout (${Math.round(current.idleTimeoutMs / 60000)}m).`);
        }, 15000);
    }

    private resolveListenHost(): string {
        const options = this.runtimeOptionsProvider ? (this.runtimeOptionsProvider() || {}) : {};
        const bind = options.bind;
        if (bind === 'loopback' || bind === 'localhost') {
            return '127.0.0.1';
        }
        return '0.0.0.0';
    }

    public async start(): Promise<void> {
        return new Promise((resolve) => {
            const host = this.resolveListenHost();
            this.wss = new WebSocketServer({
                port: this.port,
                host
            });

            this.wss.on('connection', (ws, req) => {
                console.log(`[TerminalManager] New connection attempt from ${req.socket.remoteAddress} to ${req.url} (host: ${host})`);
                this.handleConnection(ws, req);
            });

            this.wss.on('listening', () => {
                console.log(`[TerminalManager] Listening on ${host}:${this.port}`);
                resolve();
            });

            this.wss.on('error', (err) => {
                if ((err as any).code === 'EADDRINUSE') {
                    console.warn(`[TerminalManager] Port ${this.port} is already in use. Assuming another instance is active. Skipping startup.`);
                    this.wss = null;
                    resolve(); // Resolve successfully so we don't block startup
                } else {
                    console.error('[TerminalManager] WebSocket error:', err);
                }
            });
        });
    }

    public stop(): void {
        for (const sessionId of Array.from(this.sessions.keys())) {
            this.closeSession(sessionId, 4002, 'gateway-stopping');
        }
        this.wss?.close();
        this.wss = null;
        console.log('[TerminalManager] Stopped.');
    }

    public closeSession(sessionId: string, code: number = 4002, reason: string = 'session-closed'): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        const ws = session.ws;
        this.clearSession(sessionId);

        if (ws && ws.readyState === WebSocket.OPEN) {
            try { ws.close(code, reason); } catch { }
        }
        try { session.pty.kill(); } catch { }
        return true;
    }

    private attachWebSocket(sessionId: string, ws: WebSocket) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            ws.close(4404, 'session-not-found');
            return;
        }

        if (session.ws && session.ws !== ws && session.ws.readyState === WebSocket.OPEN) {
            try { session.ws.close(4001, 'replaced-connection'); } catch { }
        }
        session.ws = ws;
        session.lastActivityAt = Date.now();

        ws.on('message', (message) => {
            const current = this.sessions.get(sessionId);
            if (!current || current.ws !== ws) return;

            const msg = message.toString();
            const resize = this.parseResizeMessage(msg);
            if (resize) {
                try {
                    current.pty.resize(resize.cols, resize.rows);
                } catch {
                    // Ignore transient resize errors.
                }
                return;
            }

            current.lastActivityAt = Date.now();
            if (msg.includes('\r') || msg.includes('\n')) {
                current.atPrompt = false;
            }
            current.pty.write(msg);
        });

        ws.on('close', (code, reasonBuffer) => {
            const current = this.sessions.get(sessionId);
            if (!current || current.ws !== ws) return;

            current.ws = null;
            const reason = reasonBuffer?.toString() || '';
            console.log(`[TerminalManager] Connection detached (${sessionId}) code=${code} reason=${reason}`);
        });
    }

    private handleConnection(ws: WebSocket, req?: IncomingMessage) {
        const runtimeOptions = this.resolveRuntimeOptions(req);
        const requestedSessionId = this.resolveRequestedSessionId(req);
        const sessionId = requestedSessionId || Math.random().toString(36).substring(7);
        const idleTimeoutMs = normalizeTimeoutMs(runtimeOptions.autoTimeoutMinutes);
        const existing = this.sessions.get(sessionId);

        if (existing) {
            existing.idleTimeoutMs = idleTimeoutMs;
            if (existing.idleTimeoutMs <= 0 && existing.timeoutInterval) {
                clearInterval(existing.timeoutInterval);
                existing.timeoutInterval = undefined;
            }
            if (existing.idleTimeoutMs > 0 && !existing.timeoutInterval) {
                this.startTimeoutWatcher(sessionId);
            }
            this.attachWebSocket(sessionId, ws);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send('\r\n\x1b[36m[PowerDirector] Reconnected to existing terminal session.\x1b[0m\r\n');
            }
            return;
        }

        const { spawn } = this.getPty();
        const shellExecutable = this.resolveShellExecutable(runtimeOptions.shell);
        const shellArgs = platform() === 'win32' ? [] : ['-i'];

        let ptyProcess: any;
        try {
            ptyProcess = spawn(shellExecutable, shellArgs, {
                name: 'xterm-color',
                cols: 80,
                rows: 24,
                cwd: process.env.HOME || process.cwd(),
                env: process.env as any
            });
        } catch (err: any) {
            console.error('[TerminalManager] Failed to spawn PTY:', err);
            ws.close();
            return;
        }

        const session: TerminalSession = {
            pty: ptyProcess,
            ws: null,
            idleTimeoutMs,
            lastActivityAt: Date.now(),
            atPrompt: false,
            tailBuffer: ''
        };

        this.sessions.set(sessionId, session);
        this.startTimeoutWatcher(sessionId);
        this.attachWebSocket(sessionId, ws);

        // PTY -> Active WebSocket (if currently attached)
        ptyProcess.onData((data: string) => {
            const current = this.sessions.get(sessionId);
            if (!current) return;

            current.lastActivityAt = Date.now();
            this.updatePromptState(current, data);
            const targetWs = current.ws;
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(data);
            }
        });
    }
}
