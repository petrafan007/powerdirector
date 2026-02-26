import { NextResponse } from 'next/server';
import { getService } from '../../../../lib/agent-instance';
import { loadConfig } from '../../../../../src/config/config';
import {
    listSessionsFromStore,
    loadCombinedSessionStoreForGateway
} from '../../../../../src/gateway/session-utils';

/**
 * Returns sessions from the same SessionManager/DB as the main service
 * (respects DB_PATH and in-memory when session.persistOnDisk is false).
 */
export async function GET(request: Request) {
    try {
        // Ensure runtime is initialized before reading stores.
        getService();

        const url = new URL(request.url);
        const activeMinutesRaw = url.searchParams.get('activeMinutes');
        const limitRaw = url.searchParams.get('limit');
        const includeGlobalRaw = url.searchParams.get('includeGlobal');
        const includeUnknownRaw = url.searchParams.get('includeUnknown');
        const searchRaw = url.searchParams.get('search');
        const agentIdRaw = url.searchParams.get('agentId');
        const spawnedByRaw = url.searchParams.get('spawnedBy');
        const labelRaw = url.searchParams.get('label');

        const parseNumber = (value: string | null): number | undefined => {
            if (!value) return undefined;
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) return undefined;
            return parsed;
        };
        const parseBoolean = (value: string | null): boolean => {
            if (!value) return false;
            const normalized = value.trim().toLowerCase();
            return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
        };
        const normalizeString = (value: string | null): string | undefined => {
            if (!value) return undefined;
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : undefined;
        };

        const cfg = loadConfig();
        const combined = loadCombinedSessionStoreForGateway(cfg);
        const result = listSessionsFromStore({
            cfg,
            storePath: combined.storePath,
            store: combined.store,
            opts: {
                activeMinutes: parseNumber(activeMinutesRaw),
                limit: parseNumber(limitRaw),
                includeGlobal: parseBoolean(includeGlobalRaw),
                includeUnknown: parseBoolean(includeUnknownRaw),
                search: normalizeString(searchRaw),
                agentId: normalizeString(agentIdRaw),
                spawnedBy: normalizeString(spawnedByRaw),
                label: normalizeString(labelRaw)
            } as any
        });

        // Keep `sessions` top-level for existing UI callers while exposing full payload.
        return NextResponse.json({
            ...result,
            sessions: result.sessions
        });
    } catch (e: any) {
        console.error('Failed to read sessions', e);
        return NextResponse.json({
            error: e.message,
            ts: Date.now(),
            path: '',
            count: 0,
            defaults: {
                modelProvider: null,
                model: null,
                contextTokens: null
            },
            sessions: []
        }, { status: 500 });
    }
}
