import { exec as execCallback } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import util from 'node:util';
import {
    ensureExecApprovals,
    mergeExecApprovalsSocketDefaults,
    normalizeExecApprovals,
    readExecApprovalsSnapshot,
    saveExecApprovals,
    ExecApprovalsFile
} from '../src/nodes/exec-approvals';

const execAsync = util.promisify(execCallback);

type ApiMode = 'node-host' | 'next';
type NodePlatform = 'macos' | 'ios' | 'android' | 'linux' | 'windows';

interface WorkerConfig {
    baseUrl: string;
    apiMode: ApiMode;
    token: string;
    nodeId: string;
    nodeName: string;
    platform: NodePlatform;
    version: string;
    capabilities: string[];
    commands: string[];
    heartbeatIntervalMs: number;
    pollWaitMs: number;
    retryDelayMs: number;
    allowShell: boolean;
    shellTimeoutMs: number;
}

interface NodeCommand {
    id: string;
    nodeId: string;
    command: string;
    payload: any;
    createdAt: number;
    timeoutMs: number;
}

interface ParsedArgs {
    values: Record<string, string>;
    flags: Set<string>;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]): ParsedArgs {
    const values: Record<string, string> = {};
    const flags = new Set<string>();

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;

        const eq = token.indexOf('=');
        if (eq > 0) {
            const key = token.slice(2, eq);
            const value = token.slice(eq + 1);
            if (value.length === 0) {
                flags.add(key);
            } else {
                values[key] = value;
            }
            continue;
        }

        const key = token.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            values[key] = next;
            i += 1;
        } else {
            flags.add(key);
        }
    }

    return { values, flags };
}

function readValue(args: ParsedArgs, key: string, envKey?: string): string {
    if (args.values[key]) return args.values[key];
    if (envKey && process.env[envKey]) return process.env[envKey] as string;
    return '';
}

function hasFlag(args: ParsedArgs, key: string, envKey?: string): boolean {
    if (args.flags.has(key)) return true;
    if (args.values[key]) {
        const value = args.values[key].toLowerCase();
        return value === '1' || value === 'true' || value === 'yes' || value === 'on';
    }
    if (envKey && process.env[envKey]) {
        const value = String(process.env[envKey]).toLowerCase();
        return value === '1' || value === 'true' || value === 'yes' || value === 'on';
    }
    return false;
}

function parseIntBounded(raw: string, fallback: number, min: number, max: number): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeBaseUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return 'http://127.0.0.1:18790';
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function detectDefaultPlatform(): NodePlatform {
    const platform = os.platform();
    if (platform === 'darwin') return 'macos';
    if (platform === 'win32') return 'windows';
    if (platform === 'linux') return 'linux';
    return 'linux';
}

function parsePlatform(raw: string): NodePlatform {
    const value = raw.trim().toLowerCase();
    if (value === 'macos' || value === 'ios' || value === 'android' || value === 'linux' || value === 'windows') {
        return value;
    }
    return detectDefaultPlatform();
}

function parseCapabilities(raw: string): string[] {
    if (!raw.trim()) return [];
    const values = raw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    return [...new Set(values)];
}

function buildConfig(argv: string[]): WorkerConfig {
    const args = parseArgs(argv);
    const hostname = os.hostname().replace(/[^a-zA-Z0-9_-]/g, '-');
    const apiModeRaw = readValue(args, 'api-mode', 'NODE_WORKER_API_MODE').toLowerCase();
    const apiMode: ApiMode = apiModeRaw === 'next' ? 'next' : 'node-host';

    const baseUrlDefault = apiMode === 'next'
        ? 'http://127.0.0.1:4007'
        : 'http://127.0.0.1:18790';
    const baseUrl = normalizeBaseUrl(readValue(args, 'base-url', 'NODE_WORKER_BASE_URL') || baseUrlDefault);

    const nodeId = readValue(args, 'node-id', 'NODE_WORKER_NODE_ID') || `${hostname}-${process.pid}`;
    const nodeName = readValue(args, 'name', 'NODE_WORKER_NAME') || `Node Worker (${hostname})`;
    const platform = parsePlatform(readValue(args, 'platform', 'NODE_WORKER_PLATFORM') || detectDefaultPlatform());
    const version = readValue(args, 'version', 'NODE_WORKER_VERSION') || '1.0.0';
    const capabilities = parseCapabilities(readValue(args, 'capabilities', 'NODE_WORKER_CAPABILITIES'));
    const allowShell = hasFlag(args, 'allow-shell', 'NODE_WORKER_ALLOW_SHELL');
    const defaultCommands = allowShell
        ? ['system.run', 'shell.exec', 'noop', 'echo', 'system.execApprovals.get', 'system.execApprovals.set']
        : ['noop', 'echo', 'system.execApprovals.get', 'system.execApprovals.set'];
    const commands = parseCapabilities(readValue(args, 'commands', 'NODE_WORKER_COMMANDS') || defaultCommands.join(','));
    const token = readValue(args, 'token', 'NODE_WORKER_TOKEN');

    return {
        baseUrl,
        apiMode,
        token,
        nodeId,
        nodeName,
        platform,
        version,
        capabilities,
        commands,
        heartbeatIntervalMs: parseIntBounded(readValue(args, 'heartbeat-ms', 'NODE_WORKER_HEARTBEAT_MS'), 10000, 2000, 300000),
        pollWaitMs: parseIntBounded(readValue(args, 'poll-wait-ms', 'NODE_WORKER_POLL_WAIT_MS'), 5000, 0, 60000),
        retryDelayMs: parseIntBounded(readValue(args, 'retry-delay-ms', 'NODE_WORKER_RETRY_DELAY_MS'), 2000, 100, 60000),
        allowShell,
        shellTimeoutMs: parseIntBounded(readValue(args, 'shell-timeout-ms', 'NODE_WORKER_SHELL_TIMEOUT_MS'), 15000, 1000, 120000)
    };
}

function resolveEndpoint(config: WorkerConfig, kind: 'register' | 'heartbeat' | 'next' | 'result'): string {
    if (config.apiMode === 'next') {
        if (kind === 'register') return '/api/nodes';
        if (kind === 'heartbeat') return '/api/nodes/heartbeat';
        if (kind === 'next') return '/api/nodes/commands/next';
        return '/api/nodes/commands/result';
    }

    if (kind === 'register') return '/register';
    if (kind === 'heartbeat') return '/heartbeat';
    if (kind === 'next') return '/commands/next';
    return '/commands/result';
}

function authHeaders(token: string): Record<string, string> {
    if (!token) return {};
    return {
        Authorization: `Bearer ${token}`,
        'X-Node-Token': token
    };
}

async function requestJson(
    config: WorkerConfig,
    method: 'GET' | 'POST',
    path: string,
    body?: any
): Promise<any> {
    const url = `${config.baseUrl}${path}`;
    const headers: Record<string, string> = {
        ...authHeaders(config.token)
    };
    if (method === 'POST') {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined
    });

    const text = await response.text();
    let parsed: any = {};
    if (text.trim()) {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = { raw: text };
        }
    }

    if (!response.ok) {
        const message = typeof parsed?.error === 'string'
            ? parsed.error
            : `${response.status} ${response.statusText}`;
        throw new Error(`HTTP ${response.status} ${method} ${path}: ${message}`);
    }

    return parsed;
}

async function registerNode(config: WorkerConfig): Promise<void> {
    const path = resolveEndpoint(config, 'register');
    const payload = {
        id: config.nodeId,
        name: config.nodeName,
        displayName: config.nodeName,
        platform: config.platform,
        version: config.version,
        capabilities: config.capabilities,
        commands: config.commands
    };

    await requestJson(config, 'POST', path, payload);
    console.log(`[node-worker] registered node ${config.nodeId} (${config.platform})`);
}

async function sendHeartbeat(config: WorkerConfig): Promise<void> {
    const path = resolveEndpoint(config, 'heartbeat');
    await requestJson(config, 'POST', path, { id: config.nodeId });
}

async function fetchNextCommand(config: WorkerConfig): Promise<NodeCommand | null> {
    const path = resolveEndpoint(config, 'next');
    const query = `?nodeId=${encodeURIComponent(config.nodeId)}&waitMs=${config.pollWaitMs}`;
    const payload = await requestJson(config, 'GET', `${path}${query}`);
    return payload?.command || null;
}

async function postCommandResult(
    config: WorkerConfig,
    commandId: string,
    success: boolean,
    result?: any,
    error?: string
): Promise<void> {
    const path = resolveEndpoint(config, 'result');
    await requestJson(config, 'POST', path, {
        nodeId: config.nodeId,
        commandId,
        success,
        result,
        error
    });
}

function pickString(value: any, fallback: string = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function safeErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

async function runShellCommand(config: WorkerConfig, payload: any): Promise<any> {
    if (!config.allowShell) {
        throw new Error('shell.exec is disabled. Start the worker with --allow-shell to enable it.');
    }

    const command = pickString(payload?.command, pickString(payload?.cmd)).trim();
    if (!command) {
        throw new Error('shell.exec payload requires "command" (or "cmd").');
    }

    const timeoutMs = parseIntBounded(String(payload?.timeoutMs ?? ''), config.shellTimeoutMs, 1000, 120000);
    const cwd = pickString(payload?.cwd).trim() || process.cwd();

    const envOverrides: Record<string, string> = {};
    if (payload?.env && typeof payload.env === 'object' && !Array.isArray(payload.env)) {
        for (const [key, value] of Object.entries(payload.env)) {
            if (typeof value === 'string') envOverrides[key] = value;
        }
    }

    try {
        const { stdout, stderr } = await execAsync(command, {
            timeout: timeoutMs,
            cwd,
            env: { ...process.env, ...envOverrides }
        });
        return {
            stdout: stdout || '',
            stderr: stderr || '',
            timeoutMs,
            cwd
        };
    } catch (error: any) {
        const stdout = typeof error?.stdout === 'string' ? error.stdout : '';
        const stderr = typeof error?.stderr === 'string' ? error.stderr : '';
        const code = typeof error?.code === 'number' ? error.code : null;
        throw new Error(
            `shell.exec failed (code=${code === null ? 'unknown' : code}): ${safeErrorMessage(error)}\nstdout:\n${stdout}\nstderr:\n${stderr}`
        );
    }
}

function resolveWorkerStateDir(): string {
    const configured = (process.env.NODE_WORKER_STATE_DIR || '').trim();
    if (configured) {
        return path.resolve(configured);
    }
    return process.cwd();
}

function redactExecApprovalsFile(file: ExecApprovalsFile): ExecApprovalsFile {
    const socketPath = file.socket?.path?.trim();
    return {
        ...file,
        socket: socketPath ? { path: socketPath } : undefined
    };
}

function getLocalExecApprovalsSnapshot(): Record<string, unknown> {
    const baseDir = resolveWorkerStateDir();
    ensureExecApprovals(baseDir);
    const snapshot = readExecApprovalsSnapshot(baseDir);
    return {
        path: snapshot.path,
        exists: snapshot.exists,
        hash: snapshot.hash,
        file: redactExecApprovalsFile(snapshot.file)
    };
}

function setLocalExecApprovals(payload: any): Record<string, unknown> {
    const baseDir = resolveWorkerStateDir();
    ensureExecApprovals(baseDir);
    const snapshot = readExecApprovalsSnapshot(baseDir);
    const baseHash = typeof payload?.baseHash === 'string' ? payload.baseHash.trim() : '';
    if (snapshot.exists) {
        if (!baseHash) {
            throw new Error('exec approvals baseHash required; reload and retry');
        }
        if (baseHash !== snapshot.hash) {
            throw new Error('exec approvals changed since last load; reload and retry');
        }
    }

    const incoming = payload?.file;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
        throw new Error('exec approvals file is required');
    }

    const normalized = normalizeExecApprovals(incoming as ExecApprovalsFile);
    const merged = mergeExecApprovalsSocketDefaults({
        normalized,
        current: snapshot.file,
        baseDir
    });
    saveExecApprovals(merged, baseDir);
    const next = readExecApprovalsSnapshot(baseDir);
    return {
        path: next.path,
        exists: next.exists,
        hash: next.hash,
        file: redactExecApprovalsFile(next.file)
    };
}

async function executeCommand(config: WorkerConfig, command: NodeCommand): Promise<any> {
    switch (command.command) {
        case 'noop':
            return { ok: true };
        case 'echo':
            return { echo: command.payload ?? null };
        case 'system.run':
            return runShellCommand(config, command.payload || {});
        case 'shell.exec':
            return runShellCommand(config, command.payload || {});
        case 'system.execApprovals.get':
            return getLocalExecApprovalsSnapshot();
        case 'system.execApprovals.set':
            return setLocalExecApprovals(command.payload || {});
        default:
            throw new Error(
                `Unsupported command "${command.command}". Supported commands: ${config.commands.join(', ')}.`
            );
    }
}

function printUsage(): void {
    console.log(`Usage: ts-node bin/node-worker.ts [options]

Options:
  --api-mode <node-host|next>       Endpoint mode (default: node-host)
  --base-url <url>                  Base URL (default: http://127.0.0.1:18790 for node-host, http://127.0.0.1:4007 for next)
  --token <token>                   Node host auth token (optional if server has no token)
  --node-id <id>                    Node ID (default: <hostname>-<pid>)
  --name <name>                     Display name (default: "Node Worker (<hostname>)")
  --platform <platform>             macos|ios|android|linux|windows (default: detected)
  --version <version>               Node version string (default: 1.0.0)
  --capabilities <csv>              Capability list, e.g. "shell,screen"
  --commands <csv>                  Advertised commands list
  --heartbeat-ms <ms>               Heartbeat interval (default: 10000)
  --poll-wait-ms <ms>               Long-poll wait per request (default: 5000)
  --retry-delay-ms <ms>             Delay after poll error (default: 2000)
  --allow-shell                     Enable shell command handlers (system.run + shell.exec)
  --shell-timeout-ms <ms>           Default shell timeout when enabled (default: 15000)
  --help                            Print this help
`);
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    if (args.flags.has('help')) {
        printUsage();
        process.exit(0);
    }

    const config = buildConfig(process.argv.slice(2));
    console.log(`[node-worker] starting in ${config.apiMode} mode against ${config.baseUrl}`);

    let running = true;
    const stop = () => {
        if (!running) return;
        running = false;
        console.log('[node-worker] stop signal received, shutting down...');
    };

    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);

    await registerNode(config);
    await sendHeartbeat(config);

    const heartbeatTimer = setInterval(() => {
        sendHeartbeat(config).catch((error) => {
            console.warn(`[node-worker] heartbeat failed: ${safeErrorMessage(error)}`);
        });
    }, config.heartbeatIntervalMs);

    try {
        while (running) {
            try {
                const command = await fetchNextCommand(config);
                if (!command) continue;

                console.log(`[node-worker] received command ${command.id}: ${command.command}`);
                try {
                    const result = await executeCommand(config, command);
                    await postCommandResult(config, command.id, true, result);
                    console.log(`[node-worker] command ${command.id} completed`);
                } catch (error) {
                    const message = safeErrorMessage(error);
                    await postCommandResult(config, command.id, false, undefined, message);
                    console.warn(`[node-worker] command ${command.id} failed: ${message}`);
                }
            } catch (error) {
                if (!running) break;
                console.warn(`[node-worker] poll error: ${safeErrorMessage(error)}`);
                await sleep(config.retryDelayMs);
            }
        }
    } finally {
        clearInterval(heartbeatTimer);
    }
}

main().catch((error) => {
    console.error(`[node-worker] fatal error: ${safeErrorMessage(error)}`);
    process.exit(1);
});
