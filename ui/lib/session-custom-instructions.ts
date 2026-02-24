import Database from 'better-sqlite3';
import { getConfigManager } from './config-instance';
import { resolvePowerDirectorRoot } from './paths';

type SessionDbRow = {
    metadata?: unknown;
};

type SessionDb = {
    prepare: (sql: string) => {
        get: (...args: unknown[]) => SessionDbRow | undefined;
        run: (...args: unknown[]) => unknown;
    };
};

type SessionManagerLike = {
    dbManager?: {
        getDb?: () => SessionDb;
    };
};

export function normalizeCustomInstructions(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function parseMetadata(raw: unknown): Record<string, unknown> {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return parsed as Record<string, unknown>;
    } catch {
        return {};
    }
}

function getSessionDb(service: unknown): SessionDb | null {
    const sessionManager = (service as { sessionManager?: SessionManagerLike })?.sessionManager;
    const getDb = sessionManager?.dbManager?.getDb;
    if (typeof getDb !== 'function') return null;
    try {
        return getDb();
    } catch {
        return null;
    }
}

function resolveFallbackDbPath(): string | null {
    try {
        const configManager = getConfigManager();
        const cfg = configManager.getAll(false) || {};

        const cfgDbPath = typeof (cfg as any)?.env?.customEnvVars?.DB_PATH === 'string'
            && (cfg as any).env.customEnvVars.DB_PATH.trim().length > 0
            ? (cfg as any).env.customEnvVars.DB_PATH.trim()
            : undefined;
        const processDbPath = typeof process.env.DB_PATH === 'string' && process.env.DB_PATH.trim().length > 0
            ? process.env.DB_PATH.trim()
            : undefined;
        return cfgDbPath || processDbPath || `${resolvePowerDirectorRoot()}/powerdirector.db`;
    } catch {
        return `${resolvePowerDirectorRoot()}/powerdirector.db`;
    }
}

function withFallbackDb<T>(fn: (db: SessionDb) => T): T | undefined {
    const dbPath = resolveFallbackDbPath();
    if (!dbPath) return undefined;

    let db: Database.Database | null = null;
    try {
        db = new Database(dbPath);
        return fn(db as unknown as SessionDb);
    } catch {
        return undefined;
    } finally {
        try {
            db?.close();
        } catch {
            // Ignore close failures.
        }
    }
}

function readMetadataFromDb(db: SessionDb, sessionId: string): Record<string, unknown> | undefined {
    const row = db.prepare('SELECT metadata FROM sessions WHERE id = ?').get(sessionId);
    if (!row) return undefined;
    return parseMetadata(row.metadata);
}

export function readSessionCustomInstructions(service: unknown, sessionId: string): string | undefined {
    const serviceDb = getSessionDb(service);
    if (serviceDb) {
        const metadata = readMetadataFromDb(serviceDb, sessionId);
        if (metadata) {
            return normalizeCustomInstructions(metadata.customInstructions);
        }
    }

    const fromFallback = withFallbackDb((db) => {
        const metadata = readMetadataFromDb(db, sessionId);
        return metadata ? normalizeCustomInstructions(metadata.customInstructions) : undefined;
    });
    return typeof fromFallback === 'string' ? fromFallback : undefined;
}

export function persistSessionCustomInstructions(
    service: unknown,
    sessionId: string,
    customInstructions: string | undefined
): boolean {
    const normalized = normalizeCustomInstructions(customInstructions);
    const writeTo = (db: SessionDb): boolean => {
        const metadata = readMetadataFromDb(db, sessionId);
        if (!metadata) return false;

        if (normalized) {
            metadata.customInstructions = normalized;
        } else {
            delete metadata.customInstructions;
        }

        db.prepare(`
            UPDATE sessions
            SET metadata = ?, updated_at = ?
            WHERE id = ?
        `).run(JSON.stringify(metadata), Date.now(), sessionId);
        return true;
    };

    const serviceDb = getSessionDb(service);
    if (serviceDb && writeTo(serviceDb)) {
        return true;
    }

    const fallbackResult = withFallbackDb((db) => writeTo(db));
    return fallbackResult === true;
}

export function enrichSessionWithCustomInstructions<T extends { id: string; customInstructions?: string }>(
    service: unknown,
    session: T
): T {
    const fromDb = readSessionCustomInstructions(service, session.id);
    if (fromDb) {
        return { ...session, customInstructions: fromDb };
    }
    if (typeof session.customInstructions === 'string' && session.customInstructions.trim().length > 0) {
        return { ...session, customInstructions: session.customInstructions.trim() };
    }
    const next = { ...session };
    delete next.customInstructions;
    return next;
}
