import { NextRequest, NextResponse } from 'next/server';
import { getService } from '../../../../../lib/agent-instance';
import { authorizeNodeRequest } from '../../../../../lib/nodes-auth';

export async function POST(req: NextRequest) {
    const auth = authorizeNodeRequest(req);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 400 });
    }

    const service = getService();
    try {
        const body = await req.json();
        const nodeId = typeof body?.nodeId === 'string' ? body.nodeId.trim() : '';
        const commandId = typeof body?.commandId === 'string' ? body.commandId.trim() : '';
        if (!nodeId || !commandId) {
            return NextResponse.json({ error: 'Missing nodeId or commandId.' }, { status: 400 });
        }

        const success = Boolean(body?.success);
        const errorMessage = typeof body?.error === 'string' ? body.error : undefined;
        const outcome = service.gateway.nodeManager.submitCommandResult(
            nodeId,
            commandId,
            success,
            body?.result,
            errorMessage
        );
        return NextResponse.json({ acknowledged: true, outcome });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Invalid JSON body' }, { status: 400 });
    }
}
