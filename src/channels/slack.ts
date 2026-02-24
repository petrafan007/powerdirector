// @ts-nocheck
import { App } from '@slack/bolt';
import { Channel, ChannelMessage, ChannelType, ChannelClassName } from './base.ts';

export class SlackChannel implements Channel {
    public id = 'slack';
    public name = 'Slack';
    public type: ChannelType = 'messaging';
    public className: ChannelClassName = 'SlackChannel';

    private app: App | null = null;
    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private token?: string;
    private appToken?: string;
    private lastError?: string;

    constructor(token?: string, appToken?: string) {
        this.token = token || process.env.SLACK_BOT_TOKEN;
        this.appToken = appToken || process.env.SLACK_APP_TOKEN;

        if (this.token && this.appToken) {
            this.app = new App({
                token: this.token,
                appToken: this.appToken,
                socketMode: true,
            });
        }
    }

    async start(): Promise<void> {
        if (!this.app) {
            console.log('Slack channel skipped (missing bot token or app token).');
            return;
        }

        try {
            this.app.message(async ({ message, say }) => {
                if (!this.messageHandler) return;

                // Narrowing type for message to ensure it has 'text' and 'user'
                if (message.subtype && message.subtype !== 'bot_message') return; // Ignore some subtypes if needed
                const text = (message as any).text || '';
                const user = (message as any).user || 'unknown';
                const ts = (message as any).ts || Date.now().toString();

                const channelMsg: ChannelMessage = {
                    id: ts,
                    channelId: this.id,
                    content: text,
                    senderId: user,
                    replyToId: message.channel,
                    timestamp: parseFloat(ts) * 1000, // Slack ts is seconds.micro
                    metadata: message
                };

                this.messageHandler(channelMsg);
            });

            await this.app.start();
            this.lastError = undefined;
            console.log('Slack Channel started (Socket Mode).');

        } catch (error: any) {
            this.lastError = error.message;
            console.error('Failed to start Slack App:', error);
        }
    }

    async stop(): Promise<void> {
        if (this.app) {
            // bolt app doesn't have a clean 'stop' in all versions without custom server, 
            // but usually process exit handles it. 
            // For SocketMode, we can try to disconnect if method exists, otherwise just nullify.
            console.log('Stopping Slack Channel...');
        }
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        if (!this.app) return;

        try {
            await this.app.client.chat.postMessage({
                channel: recipientId,
                text: typeof content === 'string' ? content : JSON.stringify(content),
            });
        } catch (error) {
            console.error(`Failed to send Slack message to ${recipientId}:`, error);
        }
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: !!this.app, // Socket mode doesn't expose easy connected flag
            running: !!this.app,
            error: this.lastError
        };
    }

    async probe() {
        if (!this.app) return { ok: false, error: 'App not initialized' };
        try {
            await this.app.client.auth.test();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}
