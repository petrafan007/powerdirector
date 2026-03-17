// @ts-nocheck
import { Channel, ChannelMessage } from './base';
import * as matrix from 'matrix-js-sdk';

export class MatrixChannel implements Channel {
    public id: string = 'matrix';
    public name = 'matrix';
    public type: 'messaging' = 'messaging';
    private client: matrix.MatrixClient;
    private messageHandler?: (msg: ChannelMessage) => void;
    private lastError?: string;

    constructor(baseUrl: string, accessToken: string, userId: string) {
        this.client = matrix.createClient({
            baseUrl,
            accessToken,
            userId
        });

        // @ts-ignore
        this.client.on('Room.timeline', (event: any, room: any, toStartOfTimeline: boolean) => {
            if (toStartOfTimeline) return; // Ignore old messages
            if (event.getType() !== 'm.room.message') return;

            const content = event.getContent();
            const sender = event.getSender();

            // Ignore own messages (basic check)
            if (sender === userId) return;

            if (this.messageHandler && content.body) {
                this.messageHandler({
                    id: event.getId(),
                    channelId: this.id,
                    content: content.body,
                    senderId: sender,
                    replyToId: room.roomId,
                    timestamp: event.getTs(),
                    metadata: { roomId: room.roomId }
                });
            }
        });
    }

    async start(): Promise<void> {
        console.log('Starting Matrix sync...');
        await this.client.startClient({ initialSyncLimit: 10 });
    }

    async stop(): Promise<void> {
        this.client.stopClient();
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        // recipientId is roomId in Matrix
        const body = typeof content === 'string' ? content : JSON.stringify(content);
        // Use sendHtmlMessage for better compatibility or cast
        await this.client.sendHtmlMessage(recipientId, body, body);
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: this.client.isLoggedIn(),
            running: true,
            error: this.lastError
        };
    }

    async probe() {
        try {
            await this.client.whoami();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}
