// @ts-nocheck
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type ExecSecurity = 'deny' | 'allowlist' | 'full';
export type ExecAsk = 'off' | 'on-miss' | 'always';

export type ExecApprovalsDefaults = {
    security?: ExecSecurity;
    ask?: ExecAsk;
    askFallback?: ExecSecurity;
    autoAllowSkills?: boolean;
};

export type ExecApprovalsAllowlistEntry = {
    id?: string;
    pattern: string;
    lastUsedAt?: number;
    lastUsedCommand?: string;
    lastResolvedPath?: string;
};

export type ExecApprovalsAgent = ExecApprovalsDefaults & {
    allowlist?: ExecApprovalsAllowlistEntry[];
};

export type ExecApprovalsFile = {
    version?: number;
    socket?: {
        path?: string;
        token?: string;
    };
    defaults?: ExecApprovalsDefaults;
    agents?: Record<string, ExecApprovalsAgent>;
};

export type ExecApprovalsSnapshot = {
    path: string;
    exists: boolean;
    raw: string | null;
    file: ExecApprovalsFile;
    hash: string;
};

function hashRaw(raw: string | null): string {
    return crypto.createHash('sha256').update(raw ?? '').digest('hex');
}

function resolveStateRoot(baseDir?: string): string {
    return path.join(baseDir || process.cwd(), 'state');
}

export function resolveExecApprovalsPath(baseDir?: string): string {
    return path.join(resolveStateRoot(baseDir), 'exec-approvals.json');
}

export function resolveExecApprovalsSocketPath(baseDir?: string): string {
    return path.join(resolveStateRoot(baseDir), 'exec-approvals.sock');
}

function normalizeSecurity(value: ExecSecurity | undefined): ExecSecurity | undefined {
    if (value === 'deny' || value === 'allowlist' || value === 'full') return value;
    return undefined;
}

function normalizeAsk(value: ExecAsk | undefined): ExecAsk | undefined {
    if (value === 'off' || value === 'on-miss' || value === 'always') return value;
    return undefined;
}

function coerceAllowlistEntries(entries: unknown): ExecApprovalsAllowlistEntry[] | undefined {
    if (!Array.isArray(entries)) return undefined;
    const next: ExecApprovalsAllowlistEntry[] = [];
    for (const item of entries) {
        if (typeof item === 'string') {
            const pattern = item.trim();
            if (pattern) next.push({ pattern });
            continue;
        }
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const pattern = typeof (item as { pattern?: unknown }).pattern === 'string'
            ? ((item as { pattern: string }).pattern || '').trim()
            : '';
        if (!pattern) continue;
        next.push({
            ...item as ExecApprovalsAllowlistEntry,
            pattern
        });
    }
    return next.length > 0 ? next : undefined;
}

function ensureAllowlistIds(
    entries: ExecApprovalsAllowlistEntry[] | undefined
): ExecApprovalsAllowlistEntry[] | undefined {
    if (!entries || entries.length === 0) return entries;
    let changed = false;
    const next = entries.map((entry) => {
        if (entry.id && entry.id.trim()) return entry;
        changed = true;
        return { ...entry, id: crypto.randomUUID() };
    });
    return changed ? next : entries;
}

function normalizeAgent(agent: ExecApprovalsAgent | undefined): ExecApprovalsAgent {
    if (!agent || typeof agent !== 'object') return {};
    const allowlist = ensureAllowlistIds(coerceAllowlistEntries(agent.allowlist));
    return {
        security: normalizeSecurity(agent.security),
        ask: normalizeAsk(agent.ask),
        askFallback: normalizeSecurity(agent.askFallback),
        autoAllowSkills: typeof agent.autoAllowSkills === 'boolean' ? agent.autoAllowSkills : undefined,
        allowlist
    };
}

export function normalizeExecApprovals(file: ExecApprovalsFile): ExecApprovalsFile {
    const agentsRaw = file.agents && typeof file.agents === 'object' ? file.agents : {};
    const agents: Record<string, ExecApprovalsAgent> = {};
    for (const [agentId, value] of Object.entries(agentsRaw)) {
        agents[agentId] = normalizeAgent(value);
    }

    return {
        version: 1,
        socket: {
            path: typeof file.socket?.path === 'string' && file.socket.path.trim()
                ? file.socket.path.trim()
                : undefined,
            token: typeof file.socket?.token === 'string' && file.socket.token.trim()
                ? file.socket.token.trim()
                : undefined
        },
        defaults: {
            security: normalizeSecurity(file.defaults?.security),
            ask: normalizeAsk(file.defaults?.ask),
            askFallback: normalizeSecurity(file.defaults?.askFallback),
            autoAllowSkills: typeof file.defaults?.autoAllowSkills === 'boolean'
                ? file.defaults.autoAllowSkills
                : undefined
        },
        agents
    };
}

function ensureDir(filePath: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function generateSocketToken(): string {
    return crypto.randomBytes(24).toString('base64url');
}

export function readExecApprovalsSnapshot(baseDir?: string): ExecApprovalsSnapshot {
    const filePath = resolveExecApprovalsPath(baseDir);
    if (!fs.existsSync(filePath)) {
        const file = normalizeExecApprovals({ version: 1, agents: {} });
        return {
            path: filePath,
            exists: false,
            raw: null,
            file,
            hash: hashRaw(null)
        };
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    let parsed: ExecApprovalsFile | null = null;
    try {
        parsed = JSON.parse(raw) as ExecApprovalsFile;
    } catch {
        parsed = null;
    }

    const file = parsed && typeof parsed === 'object'
        ? normalizeExecApprovals(parsed)
        : normalizeExecApprovals({ version: 1, agents: {} });

    return {
        path: filePath,
        exists: true,
        raw,
        file,
        hash: hashRaw(raw)
    };
}

export function saveExecApprovals(file: ExecApprovalsFile, baseDir?: string): void {
    const filePath = resolveExecApprovalsPath(baseDir);
    ensureDir(filePath);
    fs.writeFileSync(filePath, `${JSON.stringify(normalizeExecApprovals(file), null, 2)}\n`, { mode: 0o600 });
    try {
        fs.chmodSync(filePath, 0o600);
    } catch {
        // Best effort.
    }
}

export function ensureExecApprovals(baseDir?: string): ExecApprovalsFile {
    const snapshot = readExecApprovalsSnapshot(baseDir);
    const current = snapshot.file;
    const next: ExecApprovalsFile = {
        ...current,
        socket: {
            path: current.socket?.path || resolveExecApprovalsSocketPath(baseDir),
            token: current.socket?.token || generateSocketToken()
        }
    };
    saveExecApprovals(next, baseDir);
    return next;
}

export function mergeExecApprovalsSocketDefaults(params: {
    normalized: ExecApprovalsFile;
    current?: ExecApprovalsFile;
    baseDir?: string;
}): ExecApprovalsFile {
    const currentPath = params.current?.socket?.path?.trim();
    const currentToken = params.current?.socket?.token?.trim();
    const socketPath = params.normalized.socket?.path?.trim()
        || currentPath
        || resolveExecApprovalsSocketPath(params.baseDir);
    const token = params.normalized.socket?.token?.trim()
        || currentToken
        || generateSocketToken();

    return {
        ...normalizeExecApprovals(params.normalized),
        socket: {
            path: socketPath,
            token
        }
    };
}
