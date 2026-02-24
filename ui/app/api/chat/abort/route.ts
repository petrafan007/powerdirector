import { NextResponse } from 'next/server';
import { getService } from '../../../../lib/agent-instance';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
        const runId = typeof body?.runId === 'string' ? body.runId.trim() : '';

        if (!sessionId) {
            return NextResponse.json({ ok: false, error: 'Missing sessionId' }, { status: 400 });
        }

        const service = getService();
        const result = service.gateway.abortRun(sessionId, runId || undefined);

        return NextResponse.json({ ok: true, aborted: result.aborted, runId: result.runId });
    } catch (error: any) {
        console.error('[API/Chat/Abort] Error:', error);
        return NextResponse.json({ ok: false, error: error?.message || 'Abort failed' }, { status: 500 });
    }
}
