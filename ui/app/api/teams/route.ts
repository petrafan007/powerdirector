import { NextResponse } from 'next/server';
import { TeamsChannel } from '../../../../src/channels/teams';
import { getService } from '../../../lib/agent-instance';

export const runtime = 'nodejs';

export async function GET() {
    const service = getService();
    const channel = service.gateway.getChannel('msteams') || service.gateway.getChannel('teams');
    return NextResponse.json({
        configured: channel instanceof TeamsChannel
    });
}

export async function POST(request: Request) {
    let activity: any;
    try {
        activity = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const service = getService();
    const channel = service.gateway.getChannel('msteams') || service.gateway.getChannel('teams');
    if (!(channel instanceof TeamsChannel)) {
        return NextResponse.json({ error: 'Teams channel is not configured or enabled.' }, { status: 503 });
    }

    try {
        const authHeader = request.headers.get('authorization') || '';
        await channel.processActivity(activity, authHeader);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to process Teams activity.' }, { status: 500 });
    }
}
