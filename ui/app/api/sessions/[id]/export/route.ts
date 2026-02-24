import { NextResponse } from 'next/server';
import { getService } from '../../../../../lib/agent-instance';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const service = getService();

    const requestedFormat = new URL(request.url).searchParams.get('format');
    const format = (requestedFormat || 'json') as 'json' | 'markdown';
    const normalizedFormat = format === 'markdown' ? 'markdown' : 'json';

    const exported = service.sessionManager.exportSession(id, normalizedFormat);
    if (!exported) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (normalizedFormat === 'markdown') {
        return new NextResponse(exported, {
            headers: {
                'Content-Type': 'text/markdown; charset=utf-8'
            }
        });
    }

    return new NextResponse(exported, {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    });
}
