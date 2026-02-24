import { NextRequest, NextResponse } from 'next/server';
import { getService } from '@/lib/agent-instance';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const secret = req.headers.get('x-webhook-secret');

        // Simple security check
        if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const agentService = getService();
        const webhookSessionName = 'session_webhook_events';
        let session = agentService.sessionManager.listSessions().find(s => s.name === webhookSessionName);
        if (!session) {
            session = agentService.sessionManager.createSession(webhookSessionName);
        }

        const msg = {
            role: 'user' as const,
            content: `[Webhook Event]\\n${JSON.stringify(body, null, 2)}`,
            timestamp: Date.now()
        };
        agentService.sessionManager.saveMessage(session.id, msg);

        const shouldTriggerAgent = req.nextUrl.searchParams.get('runAgent') === 'true';
        if (shouldTriggerAgent) {
            const response = await agentService.agent.runStep(session.id, 'Webhook received. Analyze and summarize this event.');
            return NextResponse.json({ success: true, sessionId: session.id, response });
        }

        return NextResponse.json({ success: true, sessionId: session.id, message: 'Webhook stored' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
