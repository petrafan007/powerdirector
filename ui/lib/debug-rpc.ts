import { getConfigManager } from './config-instance';
import { getService } from './agent-instance';
import { tailLogs } from './logs-tail';

export type EventLogEntry = {
    ts: number;
    event: string;
    payload?: unknown;
};

type DebugSnapshot = {
    status: Record<string, unknown>;
    health: Record<string, unknown>;
    models: unknown[];
    heartbeat: Record<string, unknown>;
    eventLog: EventLogEntry[];
};

function asObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : {};
}

function toJsonSafe(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === 'bigint') {
        const asNumber = Number(value);
        return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
    }
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((entry) => toJsonSafe(entry, seen));
    }
    if (typeof value === 'object') {
        if (seen.has(value as object)) {
            return '[circular]';
        }
        seen.add(value as object);
        const source = value as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(source)) {
            out[key] = toJsonSafe(entry, seen);
        }
        return out;
    }
    return String(value);
}

function toFiniteNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function normalizeLogLevel(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const lowered = value.toLowerCase();
    if (lowered === 'trace' || lowered === 'debug' || lowered === 'info' || lowered === 'warn' || lowered === 'error' || lowered === 'fatal') {
        return lowered;
    }
    return null;
}

function resolveGatewayEndpoint(method: string, params: unknown): { path: string } | null {
    const p = asObject(params);
    if (method === 'status') return { path: '/status' };
    if (method === 'health') {
        return {
            path: p.probe === true ? '/health?probe=true' : '/health'
        };
    }
    if (method === 'channels.status') {
        const query = new URLSearchParams();
        if (p.probe === true) query.set('probe', 'true');
        if (typeof p.channel === 'string' && p.channel.trim().length > 0) query.set('channel', p.channel.trim());
        if (typeof p.accountId === 'string' && p.accountId.trim().length > 0) query.set('accountId', p.accountId.trim());
        return {
            path: query.toString() ? `/channels/status?${query.toString()}` : '/channels/status'
        };
    }
    return null;
}

function parseLogEventLine(line: string): EventLogEntry | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;
        const tsValue = toFiniteNumber(obj.ts)
            ?? Date.parse(typeof obj.time === 'string' ? obj.time : '')
            ?? Date.now();
        const level = normalizeLogLevel(obj.level);
        const message = typeof obj.msg === 'string'
            ? obj.msg
            : (typeof obj.message === 'string' ? obj.message : trimmed);
        const event = level ? `log.${level}` : 'log.event';
        return {
            ts: Number.isFinite(tsValue) ? tsValue : Date.now(),
            event,
            payload: toJsonSafe({
                message,
                ...obj
            })
        };
    } catch {
        return {
            ts: Date.now(),
            event: 'log.raw',
            payload: toJsonSafe({ line: trimmed })
        };
    }
}

function buildModelCatalog(): unknown[] {
    const config = getConfigManager().getAll(false) as any;
    const providers = asObject(config?.models?.providers);
    const catalog: Array<Record<string, unknown>> = [];

    for (const [provider, providerValue] of Object.entries(providers)) {
        const providerConfig = asObject(providerValue);
        const models = Array.isArray(providerConfig.models) ? providerConfig.models : [];
        for (const entry of models) {
            const model = asObject(entry);
            const name = typeof model.name === 'string' && model.name.trim().length > 0
                ? model.name.trim()
                : undefined;
            if (!name) continue;
            catalog.push({
                provider,
                name,
                alias: typeof model.alias === 'string' ? model.alias : undefined,
                maxTokens: toFiniteNumber(model.maxTokens),
                timeoutOverride: toFiniteNumber(model.timeoutOverride),
                rateLimit: typeof model.rateLimit === 'object' && model.rateLimit != null ? model.rateLimit : undefined
            });
        }
    }

    return toJsonSafe(catalog) as unknown[];
}

async function callGatewayEndpoint(path: string): Promise<Record<string, unknown>> {
    getService();
    const config = getConfigManager().getAll(false) as any;
    const gatewayCfg = asObject(config.gateway);
    const port = toFiniteNumber(gatewayCfg.port) ?? 3012;
    const authCfg = asObject(gatewayCfg.auth);
    const authToken = typeof authCfg.token === 'string' && authCfg.token.trim().length > 0
        ? authCfg.token.trim()
        : '';

    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        cache: 'no-store',
        headers: authToken
            ? { Authorization: `Bearer ${authToken}` }
            : {}
    });
    const text = await response.text();
    let json: any = {};
    if (text.trim()) {
        try {
            json = JSON.parse(text);
        } catch {
            json = { raw: text };
        }
    }
    if (!response.ok) {
        const errorMessage = typeof json?.error === 'string'
            ? json.error
            : `Gateway returned HTTP ${response.status}`;
        throw new Error(errorMessage);
    }
    return asObject(toJsonSafe(json));
}

async function buildHeartbeat(): Promise<Record<string, unknown>> {
    const status = await callGatewayEndpoint('/status');
    return toJsonSafe({
        ts: Date.now(),
        inFlight: status.inFlight ?? 0,
        queueDepth: status.queueDepth ?? 0,
        sessionCount: status.sessionCount ?? 0
    }) as Record<string, unknown>;
}

async function buildEventLog(): Promise<EventLogEntry[]> {
    const tail = await tailLogs({ limit: 40, maxBytes: 250_000 });
    const entries = tail.lines
        .map(parseLogEventLine)
        .filter((entry): entry is EventLogEntry => Boolean(entry))
        .slice(-20);
    return entries;
}

export async function getDebugSnapshot(): Promise<DebugSnapshot> {
    const [status, health, heartbeat, eventLog] = await Promise.all([
        callGatewayEndpoint('/status'),
        callGatewayEndpoint('/health'),
        buildHeartbeat(),
        buildEventLog()
    ]);

    return toJsonSafe({
        status,
        health,
        models: buildModelCatalog(),
        heartbeat,
        eventLog
    }) as DebugSnapshot;
}

export async function callDebugMethod(method: string, params: unknown): Promise<unknown> {
    const name = String(method || '').trim();
    if (!name) {
        throw new Error('Method is required.');
    }

    const endpoint = resolveGatewayEndpoint(name, params);
    if (endpoint) {
        return toJsonSafe(await callGatewayEndpoint(endpoint.path));
    }

    if (name === 'models.list') {
        return toJsonSafe({ models: buildModelCatalog() });
    }

    if (name === 'last-heartbeat') {
        return toJsonSafe(await buildHeartbeat());
    }

    if (name === 'logs.tail') {
        return toJsonSafe(await tailLogs(asObject(params)));
    }

    if (name === 'debug.snapshot') {
        return toJsonSafe(await getDebugSnapshot());
    }

    throw new Error(`Unsupported debug method "${name}".`);
}
