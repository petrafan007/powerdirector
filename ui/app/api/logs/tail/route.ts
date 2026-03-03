import { NextResponse } from 'next/server';
import { tailLogs } from '../../../../lib/logs-tail';

function parseOptionalInt(raw: string | null, field: string): number | undefined {
    if (raw == null || raw.trim().length === 0) return undefined;
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) {
        throw new Error(`${field} must be an integer.`);
    }
    return value;
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const cursor = parseOptionalInt(url.searchParams.get('cursor'), 'cursor');
        const limit = parseOptionalInt(url.searchParams.get('limit'), 'limit');
        const maxBytes = parseOptionalInt(url.searchParams.get('maxBytes'), 'maxBytes');

        const payload = await tailLogs({ cursor, limit, maxBytes });
        return NextResponse.json(payload);
    } catch (error: any) {
        const message = typeof error?.message === 'string' ? error.message : 'Failed to load logs.';
        const status = message.includes('must be an integer') ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
