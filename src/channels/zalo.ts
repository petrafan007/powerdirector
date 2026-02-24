// @ts-nocheck
import { Channel, ChannelMessage, ChannelType, ChannelClassName } from './base.ts';
import { getMe, sendMessage, getUpdates, ZaloUpdate, ZaloApiError } from './zalo/api.ts';

export interface ZaloChannelOptions {
    botToken: string;
    dmPolicy?: 'pairing' | 'allowlist' | 'open' | 'disabled';
    allowFrom?: string[];
}

export class ZaloChannel implements Channel {
    public id = 'zalo';
    public name = 'Zalo';
    public type: ChannelType = 'messaging';
    public className: ChannelClassName = 'ZaloChannel';

    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private options: ZaloChannelOptions;
    private isRunning = false;
    private abortController: AbortController | null = null;

    constructor(options: ZaloChannelOptions) {
        this.options = options;
    }

    async start(): Promise<void> {
        if (this.isRunning) return;

        try {
            const me = await getMe(this.options.botToken);
            console.log(`[Zalo] Started channel for bot: ${me.result?.name} (ID: ${me.result?.id})`);
            
            this.isRunning = true;
            this.abortController = new AbortController();
            this.startPolling();
        } catch (error) {
            console.error('[Zalo] Failed to start channel:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        this.isRunning = false;
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        console.log('[Zalo] Channel stopped');
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        await sendMessage(this.options.botToken, {
            chat_id: recipientId,
            text
        });
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: this.isRunning,
            running: this.isRunning
        };
    }

    async probe() {
        try {
            await getMe(this.options.botToken);
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }

    private async startPolling() {
        while (this.isRunning) {
            try {
                const update = await getUpdates(this.options.botToken, { timeout: 30 });
                if (update.ok && update.result) {
                    this.handleUpdate(update.result);
                }
            } catch (error) {
                if (error instanceof ZaloApiError && error.isPollingTimeout) {
                    continue;
                }
                if (this.isRunning) {
                    console.error('[Zalo] Polling error:', error);
                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
    }

    private handleUpdate(update: ZaloUpdate) {
        if (!this.messageHandler || !update.message) return;

        const msg = update.message;
        const senderId = msg.from.id;

        // Check DM policy
        if (this.options.dmPolicy === 'allowlist' && this.options.allowFrom) {
            if (!this.options.allowFrom.includes(senderId)) {
                console.log(`[Zalo] Blocked message from unauthorized sender: ${senderId}`);
                return;
            }
        }

        this.messageHandler({
            id: msg.message_id,
            channelId: this.id,
            content: msg.text || '',
            senderId: senderId,
            timestamp: msg.date * 1000,
            metadata: {
                from: msg.from,
                chat: msg.chat
            }
        });
    }
}
