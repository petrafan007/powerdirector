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
        const id = typeof body?.id === 'string' ? body.id : '';
        if (!id) {
            return NextResponse.json({ error: 'Missing node id.' }, { status: 400 });
        }

        service.gateway.nodeManager.updateHeartbeat(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Invalid JSON body' }, { status: 400 });
    }
}
