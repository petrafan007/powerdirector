import { NextResponse } from 'next/server';
import { getService } from '../../../../../lib/agent-instance';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const service = getService();
    const closed = service.gateway.terminalManager.closeSession(id);
    if (!closed) {
        return NextResponse.json({ success: false, error: 'Terminal session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
}
