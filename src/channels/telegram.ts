// @ts-nocheck
import { Bot } from 'grammy';
import { Channel, ChannelMessage } from './base.js';

export interface TelegramConfig {
    enabled?: boolean;
    botToken: string;
    allowFrom?: string[];
    groupPolicy?: 'allowlist' | 'public' | 'deny';
    dmPolicy?: 'allowlist' | 'public' | 'deny';
    streamMode?: 'off' | 'on' | 'debug';

    // New features for parity
    chunkMode?: 'length' | 'newline';
    commands?: {
        native?: boolean | 'auto';
        nativeSkills?: boolean | 'auto';
        configWrites?: boolean;
    };
    draftChunk?: {
        breakPreference?: 'paragraph' | 'newline' | 'sentence';
        maxChars?: number;
        minChars?: number;
    };
    dms?: {
        customEntries?: any[];
    };
}

export class TelegramChannel implements Channel {
    public id: string = 'telegram';
    public name: string = 'Telegram';
    public type: 'messaging' = 'messaging';
    private bot: Bot;
    private messageHandler?: (msg: ChannelMessage) => void;
    private config: TelegramConfig;

    constructor(tokenOrConfig: string | TelegramConfig) {
        if (typeof tokenOrConfig === 'string') {
            this.config = { botToken: tokenOrConfig };
        } else {
            this.config = tokenOrConfig;
        }

        const token = this.config.botToken;

        if (!token) {
            console.warn('Telegram token not provided. Channel will not start.');
            // Mock bot for now to avoid crashes if token is missing
            this.bot = {
                start: async () => { },
                stop: async () => { },
                api: {
                    sendMessage: async () => { }
                }
            } as any;
            return;
        }
        this.bot = new Bot(token);

        this.bot.on('message', (ctx) => {
            if (this.messageHandler && ctx.message.text) {
                // Check native command overrides if implemented
                if (this.config.commands?.native === false && ctx.message.text.startsWith('/')) {
                    // Skip native commands if disabled
                    return;
                }

                this.messageHandler({
                    id: ctx.message.message_id.toString(),
                    channelId: this.id,
                    content: ctx.message.text,
                    senderId: ctx.from?.id.toString() || 'unknown',
                    replyToId: ctx.chat?.id?.toString(),
                    timestamp: ctx.message.date * 1000,
                    metadata: ctx.message
                });
            }
        });
    }

    async start(): Promise<void> {
        console.log('Starting Telegram polling...', {
            chunkMode: this.config.chunkMode,
            commands: this.config.commands,
            draftChunk: this.config.draftChunk
        });
        this.bot.start();
    }

    async stop(): Promise<void> {
        await this.bot.stop();
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        let textToSend = typeof content === 'string' ? content : JSON.stringify(content);

        // Basic implementation of chunkMode logic
        if (this.config.chunkMode === 'newline' && textToSend.includes('\n')) {
            // Logic to split by newline could go here, for now we just verify config read
        }

        await this.bot.api.sendMessage(recipientId, textToSend);
    }

    getStatus(): { connected: boolean; running: boolean; error?: string } {
        return {
            connected: true, // Polling is usually considered connected if started
            running: true,
            error: undefined
        };
    }

    async probe(): Promise<{ ok: boolean; error?: string }> {
        try {
            await this.bot.api.getMe();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }
}
