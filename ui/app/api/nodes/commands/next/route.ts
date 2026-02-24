import { NextRequest, NextResponse } from 'next/server';
import { getService } from '../../../../../lib/agent-instance';
import { authorizeNodeRequest } from '../../../../../lib/nodes-auth';

export async function GET(req: NextRequest) {
    const auth = authorizeNodeRequest(req);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 400 });
    }

    const nodeId = (req.nextUrl.searchParams.get('nodeId') || '').trim();
    const waitMsRaw = req.nextUrl.searchParams.get('waitMs');
    const waitMs = waitMsRaw && Number.isFinite(Number(waitMsRaw))
        ? Number(waitMsRaw)
        : undefined;
    if (!nodeId) {
        return NextResponse.json({ error: 'Missing nodeId query parameter.' }, { status: 400 });
    }

    const service = getService();
    try {
        const command = await service.gateway.nodeManager.waitForCommand(nodeId, waitMs);
        return NextResponse.json({ command });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to fetch next command.' }, { status: 400 });
    }
}
