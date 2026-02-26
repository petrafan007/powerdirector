
import { NextResponse } from 'next/server';
import { validateSignature, WebhookRequestBody, WebhookEvent } from '@line/bot-sdk';
import { getService } from '../../../lib/agent-instance';
import { LineChannel } from '@/src-backend/channels/line';

export async function POST(request: Request) {
    const signature = request.headers.get('x-line-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const bodyText = await request.text();

    // Retrieve channel to get the secret for validation
    const service = getService();
    // Assuming 'line' is the key used in registration
    const channel = service.gateway.getChannel('line');

    if (!(channel instanceof LineChannel)) {
        return NextResponse.json({ error: 'LINE channel not configured' }, { status: 503 });
    }

    const channelSecret = channel.config.channelSecret;

    if (!validateSignature(bodyText, channelSecret, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body: WebhookRequestBody = JSON.parse(bodyText);

    try {
        await Promise.all(body.events.map(async (event: WebhookEvent) => {
            await channel.processEvent(event);
        }));
        return NextResponse.json({ status: 'ok' });
    } catch (err: any) {
        console.error('Error processing LINE events:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
