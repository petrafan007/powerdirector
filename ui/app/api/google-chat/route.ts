import { NextResponse } from 'next/server';
import { GoogleChatChannel } from '../../../../src/channels/google-chat';
import { getService } from '../../../lib/agent-instance';

export const runtime = 'nodejs';

export async function GET() {
    const service = getService();
    const channel = service.gateway.getChannel('googlechat') || service.gateway.getChannel('googleChat');
    return NextResponse.json({
        configured: channel instanceof GoogleChatChannel
    });
}

export async function POST(request: Request) {
    let event: any;
    try {
        event = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const service = getService();
    const channel = service.gateway.getChannel('googlechat') || service.gateway.getChannel('googleChat');
    if (!(channel instanceof GoogleChatChannel)) {
        return NextResponse.json({ error: 'Google Chat channel is not configured or enabled.' }, { status: 503 });
    }

    try {
        // In a real implementation, we should verify the bearer token here
        // const authHeader = request.headers.get('authorization') || '';
        await channel.processEvent(event);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Failed to process Google Chat event:', error);
        return NextResponse.json({ error: error?.message || 'Failed to process Google Chat event.' }, { status: 500 });
    }
}
