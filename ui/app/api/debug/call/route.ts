import { NextRequest, NextResponse } from 'next/server';
import { callDebugMethod } from '../../../../lib/debug-rpc';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const method = typeof body?.method === 'string' ? body.method : '';
        const params = body?.params;
        const result = await callDebugMethod(method, params);
        return NextResponse.json({ ok: true, result });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error?.message || 'Debug call failed.' },
            { status: 400 }
        );
    }
}
