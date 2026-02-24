// @ts-nocheck
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createAsyncLock, readJsonFile, writeJsonAtomic } from './json-files.ts';

export type DeviceTokenSummary = {
    role: string;
    scopes: string[];
    createdAtMs: number;
    rotatedAtMs?: number;
    revokedAtMs?: number;
    lastUsedAtMs?: number;
};

export type DeviceAuthToken = DeviceTokenSummary & {
    token: string;
};

export type PendingDevice = {
    requestId: string;
    deviceId: string;
    displayName?: string;
    platform?: string;
    role?: string;
    roles?: string[];
    scopes?: string[];
    remoteIp?: string;
    isRepair?: boolean;
    ts: number;
};

export type PairedDevice = {
    deviceId: string;
    displayName?: string;
    platform?: string;
    role?: string;
    roles?: string[];
    scopes?: string[];
    remoteIp?: string;
    tokens?: Record<string, DeviceAuthToken>;
    createdAtMs: number;
    approvedAtMs: number;
};

export type DevicePairingList = {
    pending: PendingDevice[];
    paired: PairedDevice[];
};

type DevicePairingState = {
    pendingById: Record<string, PendingDevice>;
    pairedByDeviceId: Record<string, PairedDevice>;
};

const PENDING_TTL_MS = 5 * 60 * 1000;
const withLock = createAsyncLock();

function resolveStateRoot(baseDir?: string): string {
    return path.join(baseDir || process.cwd(), 'state');
}

function resolvePairingPaths(baseDir?: string): { pendingPath: string; pairedPath: string } {
    const root = resolveStateRoot(baseDir);
    const dir = path.join(root, 'devices');
    return {
        pendingPath: path.join(dir, 'pending.json'),
        pairedPath: path.join(dir, 'paired.json')
    };
}

function normalizeDeviceId(deviceId: string): string {
    return deviceId.trim();
}

function normalizeRole(role: string | undefined): string | null {
    if (typeof role !== 'string') return null;
    const trimmed = role.trim();
    return trimmed || null;
}

function normalizeScopes(scopes: string[] | undefined): string[] {
    if (!Array.isArray(scopes)) return [];
    const out = new Set<string>();
    for (const scope of scopes) {
        if (typeof scope !== 'string') continue;
        const trimmed = scope.trim();
        if (trimmed) out.add(trimmed);
    }
    return [...out].sort();
}

function scopesAllow(requested: string[], allowed: string[]): boolean {
    if (requested.length === 0) return true;
    if (allowed.length === 0) return false;
    const allowedSet = new Set(allowed);
    return requested.every((scope) => allowedSet.has(scope));
}

function mergeRoles(...items: Array<string | string[] | undefined>): string[] | undefined {
    const set = new Set<string>();
    for (const item of items) {
        if (!item) continue;
        if (Array.isArray(item)) {
            for (const entry of item) {
                if (typeof entry !== 'string') continue;
                const trimmed = entry.trim();
                if (trimmed) set.add(trimmed);
            }
            continue;
        }
        const trimmed = item.trim();
        if (trimmed) set.add(trimmed);
    }
    return set.size > 0 ? [...set] : undefined;
}

function mergeScopes(...items: Array<string[] | undefined>): string[] | undefined {
    const set = new Set<string>();
    for (const item of items) {
        if (!Array.isArray(item)) continue;
        for (const entry of item) {
            if (typeof entry !== 'string') continue;
            const trimmed = entry.trim();
            if (trimmed) set.add(trimmed);
        }
    }
    return set.size > 0 ? [...set] : undefined;
}

function buildToken(params: {
    role: string;
    scopes: string[];
    existing?: DeviceAuthToken;
    now: number;
    rotatedAtMs?: number;
}): DeviceAuthToken {
    return {
        token: randomUUID(),
        role: params.role,
        scopes: params.scopes,
        createdAtMs: params.existing?.createdAtMs ?? params.now,
        rotatedAtMs: params.rotatedAtMs,
        revokedAtMs: undefined,
        lastUsedAtMs: params.existing?.lastUsedAtMs
    };
}

function pruneExpiredPending(pendingById: Record<string, PendingDevice>): void {
    const now = Date.now();
    for (const [requestId, request] of Object.entries(pendingById)) {
        if (now - request.ts > PENDING_TTL_MS) {
            delete pendingById[requestId];
        }
    }
}

async function loadState(baseDir?: string): Promise<DevicePairingState> {
    const { pendingPath, pairedPath } = resolvePairingPaths(baseDir);
    const [pending, paired] = await Promise.all([
        readJsonFile<Record<string, PendingDevice>>(pendingPath),
        readJsonFile<Record<string, PairedDevice>>(pairedPath)
    ]);

    const state: DevicePairingState = {
        pendingById: pending ?? {},
        pairedByDeviceId: paired ?? {}
    };
    pruneExpiredPending(state.pendingById);
    return state;
}

async function persistState(state: DevicePairingState, baseDir?: string): Promise<void> {
    const { pendingPath, pairedPath } = resolvePairingPaths(baseDir);
    await Promise.all([
        writeJsonAtomic(pendingPath, state.pendingById),
        writeJsonAtomic(pairedPath, state.pairedByDeviceId)
    ]);
}

export function isNodePairingEntry(entry: { role?: string; roles?: string[] }): boolean {
    if (entry.role === 'node') return true;
    if (Array.isArray(entry.roles) && entry.roles.includes('node')) return true;
    return false;
}

export async function listDevicePairing(baseDir?: string): Promise<DevicePairingList> {
    const state = await loadState(baseDir);
    const pending = Object.values(state.pendingById).sort((a, b) => b.ts - a.ts);
    const paired = Object.values(state.pairedByDeviceId).sort((a, b) => b.approvedAtMs - a.approvedAtMs);
    return { pending, paired };
}

export async function requestDevicePairing(
    request: Omit<PendingDevice, 'requestId' | 'ts' | 'isRepair'>,
    baseDir?: string
): Promise<{ status: 'pending'; request: PendingDevice; created: boolean }> {
    return withLock(async () => {
        const state = await loadState(baseDir);
        const deviceId = normalizeDeviceId(request.deviceId);
        if (!deviceId) {
            throw new Error('deviceId required');
        }

        const existingPending = Object.values(state.pendingById).find((entry) => entry.deviceId === deviceId);
        if (existingPending) {
            return { status: 'pending', request: existingPending, created: false };
        }

        const pending: PendingDevice = {
            requestId: randomUUID(),
            deviceId,
            displayName: request.displayName,
            platform: request.platform,
            role: request.role,
            roles: request.roles,
            scopes: request.scopes,
            remoteIp: request.remoteIp,
            isRepair: Boolean(state.pairedByDeviceId[deviceId]),
            ts: Date.now()
        };

        state.pendingById[pending.requestId] = pending;
        await persistState(state, baseDir);
        return { status: 'pending', request: pending, created: true };
    });
}

export async function approveDevicePairing(
    requestId: string,
    baseDir?: string
): Promise<{ requestId: string; device: PairedDevice } | null> {
    return withLock(async () => {
        const state = await loadState(baseDir);
        const pending = state.pendingById[requestId];
        if (!pending) return null;

        const now = Date.now();
        const existing = state.pairedByDeviceId[pending.deviceId];
        const roles = mergeRoles(existing?.roles, existing?.role, pending.roles, pending.role);
        const scopes = mergeScopes(existing?.scopes, pending.scopes);
        const tokens = existing?.tokens ? { ...existing.tokens } : {};
        const roleForToken = normalizeRole(pending.role);

        if (roleForToken) {
            const scoped = normalizeScopes(pending.scopes);
            const existingToken = tokens[roleForToken];
            tokens[roleForToken] = buildToken({
                role: roleForToken,
                scopes: scoped,
                existing: existingToken,
                now,
                rotatedAtMs: existingToken ? now : undefined
            });
        }

        const device: PairedDevice = {
            deviceId: pending.deviceId,
            displayName: pending.displayName,
            platform: pending.platform,
            role: pending.role,
            roles,
            scopes,
            remoteIp: pending.remoteIp,
            tokens,
            createdAtMs: existing?.createdAtMs ?? now,
            approvedAtMs: now
        };

        delete state.pendingById[requestId];
        state.pairedByDeviceId[device.deviceId] = device;
        await persistState(state, baseDir);
        return { requestId, device };
    });
}

export async function rejectDevicePairing(
    requestId: string,
    baseDir?: string
): Promise<{ requestId: string; deviceId: string } | null> {
    return withLock(async () => {
        const state = await loadState(baseDir);
        const pending = state.pendingById[requestId];
        if (!pending) return null;

        delete state.pendingById[requestId];
        await persistState(state, baseDir);
        return { requestId, deviceId: pending.deviceId };
    });
}

function resolveTokenContext(params: {
    state: DevicePairingState;
    deviceId: string;
    role: string;
}): {
    device: PairedDevice;
    role: string;
    tokens: Record<string, DeviceAuthToken>;
    existing?: DeviceAuthToken;
} | null {
    const normalizedDeviceId = normalizeDeviceId(params.deviceId);
    const device = params.state.pairedByDeviceId[normalizedDeviceId];
    if (!device) return null;

    const role = normalizeRole(params.role);
    if (!role) return null;

    const tokens = device.tokens ? { ...device.tokens } : {};
    const existing = tokens[role];
    return { device, role, tokens, existing };
}

export async function rotateDeviceToken(
    params: { deviceId: string; role: string; scopes?: string[] },
    baseDir?: string
): Promise<DeviceAuthToken | null> {
    return withLock(async () => {
        const state = await loadState(baseDir);
        const context = resolveTokenContext({
            state,
            deviceId: params.deviceId,
            role: params.role
        });
        if (!context) return null;

        const { device, role, tokens, existing } = context;
        const nextScopes = normalizeScopes(params.scopes ?? existing?.scopes ?? device.scopes);
        const now = Date.now();
        const next = buildToken({
            role,
            scopes: nextScopes,
            existing,
            now,
            rotatedAtMs: now
        });

        tokens[role] = next;
        device.tokens = tokens;
        if (params.scopes !== undefined) {
            device.scopes = nextScopes;
        }
        state.pairedByDeviceId[device.deviceId] = device;
        await persistState(state, baseDir);
        return next;
    });
}

export async function revokeDeviceToken(
    params: { deviceId: string; role: string },
    baseDir?: string
): Promise<DeviceAuthToken | null> {
    return withLock(async () => {
        const state = await loadState(baseDir);
        const normalizedDeviceId = normalizeDeviceId(params.deviceId);
        const device = state.pairedByDeviceId[normalizedDeviceId];
        if (!device) return null;

        const role = normalizeRole(params.role);
        if (!role) return null;
        if (!device.tokens?.[role]) return null;

        const tokens = { ...device.tokens };
        const entry = { ...tokens[role], revokedAtMs: Date.now() };
        tokens[role] = entry;
        device.tokens = tokens;
        state.pairedByDeviceId[device.deviceId] = device;
        await persistState(state, baseDir);
        return entry;
    });
}

export async function verifyDeviceToken(params: {
    deviceId: string;
    token: string;
    role: string;
    scopes: string[];
    baseDir?: string;
}): Promise<{ ok: boolean; reason?: string }> {
    return withLock(async () => {
        const state = await loadState(params.baseDir);
        const device = state.pairedByDeviceId[normalizeDeviceId(params.deviceId)];
        if (!device) {
            return { ok: false, reason: 'device-not-paired' };
        }

        const role = normalizeRole(params.role);
        if (!role) {
            return { ok: false, reason: 'role-missing' };
        }

        const tokenEntry = device.tokens?.[role];
        if (!tokenEntry) {
            return { ok: false, reason: 'token-missing' };
        }
        if (tokenEntry.revokedAtMs) {
            return { ok: false, reason: 'token-revoked' };
        }
        if (tokenEntry.token !== params.token) {
            return { ok: false, reason: 'token-mismatch' };
        }

        const requestedScopes = normalizeScopes(params.scopes);
        if (!scopesAllow(requestedScopes, tokenEntry.scopes)) {
            return { ok: false, reason: 'scope-mismatch' };
        }

        tokenEntry.lastUsedAtMs = Date.now();
        device.tokens = device.tokens || {};
        device.tokens[role] = tokenEntry;
        state.pairedByDeviceId[device.deviceId] = device;
        await persistState(state, params.baseDir);
        return { ok: true };
    });
}

export function summarizeDeviceTokens(
    tokens: Record<string, DeviceAuthToken> | undefined
): DeviceTokenSummary[] | undefined {
    if (!tokens) return undefined;
    const summaries = Object.values(tokens)
        .map((token) => ({
            role: token.role,
            scopes: token.scopes,
            createdAtMs: token.createdAtMs,
            rotatedAtMs: token.rotatedAtMs,
            revokedAtMs: token.revokedAtMs,
            lastUsedAtMs: token.lastUsedAtMs
        }))
        .sort((a, b) => a.role.localeCompare(b.role));

    return summaries.length > 0 ? summaries : undefined;
}
