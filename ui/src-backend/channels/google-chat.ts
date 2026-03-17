// @ts-nocheck
import { Channel, ChannelMessage } from './base';
import { GoogleAuth } from 'google-auth-library';

export interface GoogleChatConfig {
    enabled?: boolean;
    credentials?: string; // JSON string of service account key
    credentialsFile?: string; // Path to service account key file
}

export class GoogleChatChannel implements Channel {
    public id = 'googlechat';
    public name = 'Google Chat';
    public type: 'messaging' = 'messaging';

    private auth: GoogleAuth;
    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private config: GoogleChatConfig;

    constructor(config: GoogleChatConfig) {
        this.config = config;

        const scopes = ['https://www.googleapis.com/auth/chat.bot'];

        if (config.credentialsFile) {
            this.auth = new GoogleAuth({
                keyFile: config.credentialsFile,
                scopes,
            });
        } else if (config.credentials) {
            this.auth = new GoogleAuth({
                credentials: JSON.parse(config.credentials),
                scopes,
            });
        } else {
            // Fallback to ADC
            this.auth = new GoogleAuth({
                scopes,
            });
        }
    }

    async start(): Promise<void> {
        console.log('Google Chat channel initialized. Configure your bot endpoint to POST /api/google-chat');
    }

    async stop(): Promise<void> {
        // No persistent connection to close
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        const client = await this.auth.getClient();
        const token = await client.getAccessToken();

        const url = `https://chat.googleapis.com/v1/${recipientId}/messages`;

        const body = {
            text: typeof content === 'string' ? content : JSON.stringify(content)
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to send Google Chat message: ${res.status} ${err}`);
        }
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return { connected: true, running: true };
    }

    async probe() {
        try {
            const client = await this.auth.getClient();
            await client.getAccessToken();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }

    public async processEvent(event: any): Promise<void> {
        if (!this.messageHandler) return;

        // Only handle MESSAGE events for now
        if (event.type !== 'MESSAGE' || !event.message) return;

        const message = event.message;
        const space = event.space;
        const sender = message.sender;

        // Ignore messages from myself (the bot)
        if (sender.type === 'BOT') return;

        this.messageHandler({
            id: message.name,
            channelId: this.id,
            content: message.argumentText || message.text || '', // argumentText strips the bot mention
            senderId: sender.name, // users/{id}
            replyToId: space.name, // spaces/{id} - we reply to the space
            timestamp: new Date(event.eventTime).getTime(),
            metadata: {
                space,
                sender,
                thread: message.thread
            }
        });
    }
}
