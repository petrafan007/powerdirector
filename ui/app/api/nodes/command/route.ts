import { NextRequest, NextResponse } from 'next/server';
import { getService } from '../../../../lib/agent-instance';
import { authorizeNodeRequest } from '../../../../lib/nodes-auth';

export async function POST(req: NextRequest) {
    const auth = authorizeNodeRequest(req);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 400 });
    }

    const service = getService();
    try {
        const body = await req.json();
        const nodeId = typeof body?.nodeId === 'string' ? body.nodeId.trim() : '';
        const command = typeof body?.command === 'string' ? body.command.trim() : '';
        const timeoutMs = typeof body?.timeoutMs === 'number' ? body.timeoutMs : undefined;
        if (!nodeId || !command) {
            return NextResponse.json({ error: 'Missing nodeId or command.' }, { status: 400 });
        }

        const outcome = await service.gateway.nodeManager.sendCommand(nodeId, command, body?.payload, { timeoutMs });
        return NextResponse.json(outcome);
    } catch (error: any) {
        const message = error?.message || 'Invalid JSON body';
        const status = /timed out/i.test(message) ? 504 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
