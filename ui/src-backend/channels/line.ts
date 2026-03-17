// @ts-nocheck
import { Channel, ChannelMessage } from './base';
import { messagingApi, WebhookEvent } from '@line/bot-sdk';

export interface LineConfig {
    channelAccessToken: string;
    channelSecret: string;
}

export class LineChannel implements Channel {
    public id = 'line';
    public name = 'LINE';
    public type: 'messaging' = 'messaging';

    private client: messagingApi.MessagingApiClient | null = null;
    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    public config: LineConfig;

    constructor(config: LineConfig) {
        this.config = config;
    }

    async start(): Promise<void> {
        this.client = new messagingApi.MessagingApiClient({
            channelAccessToken: this.config.channelAccessToken,
        });
        console.log('LINE channel started.');
    }

    async stop(): Promise<void> {
        this.client = null;
        console.log('LINE channel stopped.');
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        if (!this.client) {
            throw new Error('LINE client not initialized');
        }

        // LINE supports text, sticker, image, template, flex, etc.
        // For parity with standard Channel interface, we handle string as text.
        // If content is object, we assume it matches one of the Message types from line/bot-sdk.

        let messages: any[] = [];

        if (typeof content === 'string') {
            messages.push({
                type: 'text',
                text: content
            });
        } else if (Array.isArray(content)) {
            messages = content;
        } else {
            messages.push(content);
        }

        await this.client.pushMessage({
            to: recipientId,
            messages: messages
        });
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return { connected: !!this.client, running: !!this.client };
    }

    async probe() {
        if (!this.client) return { ok: false, error: 'Client not initialized' };
        try {
            await this.client.getBotInfo();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }

    public async processEvent(event: WebhookEvent) {
        if (!this.messageHandler) return;

        if (event.type === 'message' && event.message.type === 'text') {
            const senderId = event.source.userId || 'unknown';
            // In LINE, reply to the userId (for 1:1) or groupId/roomId.
            const replyToId =
                event.source.type === 'group' ? event.source.groupId :
                    event.source.type === 'room' ? event.source.roomId :
                        senderId;

            this.messageHandler({
                id: event.webhookEventId,
                channelId: this.id,
                content: event.message.text,
                senderId: senderId,
                replyToId: replyToId,
                timestamp: event.timestamp,
                metadata: {
                    replyToken: event.replyToken,
                    source: event.source
                }
            });
        }
    }
}
