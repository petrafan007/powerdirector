import fs from 'node:fs';
import path from 'node:path';

export type AuthStoreProfileType = 'api_key' | 'api-key' | 'oauth' | 'token';

export interface AuthStoreProfile {
    type: AuthStoreProfileType;
    provider: string;
    key?: string;
    token?: string;
    access?: string;
    refresh?: string;
    expires?: number;
    email?: string;
    projectId?: string;
}

export interface AuthProfileStore {
    version: number;
    profiles: Record<string, AuthStoreProfile>;
    order?: Record<string, string[]>;
}

const EMPTY_AUTH_STORE: AuthProfileStore = {
    version: 1,
    profiles: {}
};

const STORE_CANDIDATES = [
    path.join('agent', 'auth-profiles.json'),
    'auth-profiles.json',
    path.join('agent', 'auth.json')
];

function isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeExpires(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return undefined;
    }
    return value;
}

function normalizeStoreProfile(value: unknown): AuthStoreProfile | undefined {
    if (!isObject(value)) return undefined;

    const typeRaw = normalizeString(value.type);
    const provider = normalizeString(value.provider);
    if (!provider) return undefined;
    if (typeRaw !== 'api_key' && typeRaw !== 'api-key' && typeRaw !== 'oauth' && typeRaw !== 'token') {
        return undefined;
    }

    return {
        type: typeRaw,
        provider,
        key: normalizeString(value.key),
        token: normalizeString(value.token),
        access: normalizeString(value.access),
        refresh: normalizeString(value.refresh),
        expires: normalizeExpires(value.expires),
        email: normalizeString(value.email),
        projectId: normalizeString(value.projectId)
    };
}

function normalizeOrder(value: unknown): Record<string, string[]> | undefined {
    if (!isObject(value)) return undefined;
    const normalized: Record<string, string[]> = {};
    for (const [provider, entries] of Object.entries(value)) {
        if (!Array.isArray(entries)) continue;
        const deduped: string[] = [];
        for (const entry of entries) {
            const id = normalizeString(entry);
            if (!id || deduped.includes(id)) continue;
            deduped.push(id);
        }
        if (deduped.length > 0) {
            normalized[provider] = deduped;
        }
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeStore(raw: unknown): AuthProfileStore | null {
    if (!isObject(raw)) return null;

    const profilesRaw = raw.profiles;
    if (!isObject(profilesRaw)) return null;

    const profiles: Record<string, AuthStoreProfile> = {};
    for (const [profileId, profileRaw] of Object.entries(profilesRaw)) {
        const normalized = normalizeStoreProfile(profileRaw);
        if (!normalized) continue;
        profiles[profileId] = normalized;
    }

    const version = typeof raw.version === 'number' && Number.isFinite(raw.version)
        ? Math.max(1, Math.trunc(raw.version))
        : 1;

    return {
        version,
        profiles,
        order: normalizeOrder(raw.order)
    };
}

function readStore(pathname: string): AuthProfileStore | null {
    if (!fs.existsSync(pathname)) return null;
    try {
        const raw = JSON.parse(fs.readFileSync(pathname, 'utf-8'));
        return normalizeStore(raw);
    } catch {
        return null;
    }
}

export function loadAuthProfileStore(rootDir: string): AuthProfileStore {
    for (const relative of STORE_CANDIDATES) {
        const pathname = path.join(rootDir, relative);
        const store = readStore(pathname);
        if (store) return store;
    }
    return EMPTY_AUTH_STORE;
}
