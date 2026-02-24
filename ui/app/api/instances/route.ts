
import { NextResponse } from 'next/server';
import type { SystemPresence } from '../../../../src/infra/system-presence';
import { listSystemPresence } from '../../../../src/infra/system-presence';

type UiInstanceEntry = {
    id: string;
    instanceId: string | null;
    host: string | null;
    ip: string | null;
    mode: string | null;
    platform: string | null;
    deviceFamily: string | null;
    modelIdentifier: string | null;
    version: string | null;
    roles: string[];
    scopes: string[];
    lastInputSeconds: number | null;
    reason: string | null;
    seenAt: number;
    text: string | null;
};

function normalizeString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((entry) => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

function toUiInstanceEntry(entry: SystemPresence, index: number): UiInstanceEntry {
    const host = normalizeString(entry.host);
    const ip = normalizeString(entry.ip);
    const instanceId = normalizeString(entry.instanceId) || normalizeString(entry.deviceId);
    const mode = normalizeString(entry.mode);
    const version = normalizeString(entry.version);
    const seenAt = typeof entry.ts === 'number' && Number.isFinite(entry.ts) ? entry.ts : Date.now();
    const id = instanceId || [host, ip, mode, version, String(index)].filter(Boolean).join(':');

    return {
        id,
        instanceId,
        host,
        ip,
        mode,
        platform: normalizeString(entry.platform),
        deviceFamily: normalizeString(entry.deviceFamily),
        modelIdentifier: normalizeString(entry.modelIdentifier),
        version,
        roles: normalizeStringList(entry.roles),
        scopes: normalizeStringList(entry.scopes),
        lastInputSeconds:
            typeof entry.lastInputSeconds === 'number' && Number.isFinite(entry.lastInputSeconds)
                ? entry.lastInputSeconds
                : null,
        reason: normalizeString(entry.reason),
        seenAt,
        text: normalizeString(entry.text)
    };
}

export async function GET() {
    try {
        const entries = listSystemPresence().map(toUiInstanceEntry);
        return NextResponse.json({
            entries,
            loading: false,
            lastError: null,
            statusMessage: entries.length === 0 ? 'No instances yet.' : null
        });
    } catch (error: any) {
        return NextResponse.json({
            entries: [],
            loading: false,
            lastError: error?.message || 'Failed to load instances.',
            statusMessage: null
        }, { status: 500 });
    }
}
