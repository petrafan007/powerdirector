// @ts-nocheck

import { Client, LocalAuth, Message as WPMessage } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { Channel, ChannelClassName, ChannelConfig, ChannelMessage, ChannelType } from './base.ts';

export class WhatsAppChannel implements Channel {
    public readonly id: string = 'whatsapp';
    public readonly name: string = 'WhatsApp';
    public readonly type: ChannelType = 'messaging';
    public readonly className: ChannelClassName = 'WhatsAppChannel';

    private client: Client;
    private messageHandler?: (msg: ChannelMessage) => void;
    private isReady: boolean = false;

    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox'],
            }
        });

        this.setupListeners();
    }

    private setupListeners() {
        this.client.on('qr', (qr) => {
            console.log('WhatsApp QR Code received. Scan it with your phone API:');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            this.isReady = true;
        });

        this.client.on('message', (msg: WPMessage) => {
            if (this.messageHandler) {
                this.messageHandler({
                    id: msg.id.id,
                    content: msg.body,
                    senderId: msg.author || msg.from,
                    replyToId: msg.from,
                    channelId: this.id,
                    timestamp: msg.timestamp * 1000,
                    metadata: {
                        raw: msg
                    }
                });
            }
        });

        this.client.on('auth_failure', (msg) => {
            console.error('WhatsApp Authentication failure:', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp Client was disconnected', reason);
            this.isReady = false;
        });
    }

    async start(): Promise<void> {
        console.log('Starting WhatsApp Channel...');
        try {
            await this.client.initialize();
        } catch (error) {
            console.error('Failed to initialize WhatsApp client:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        console.log('Stopping WhatsApp Channel...');
        await this.client.destroy();
        this.isReady = false;
    }

    async send(to: string, content: string | any): Promise<void> {
        if (!this.isReady) {
            console.warn('WhatsApp Channel is not ready. Cannot send message.');
            throw new Error('WhatsApp Channel not ready');
        }
        await this.client.sendMessage(to, content);
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus(): { connected: boolean; running: boolean; error?: string } {
        return {
            connected: this.isReady,
            running: this.isReady,
            error: this.isReady ? undefined : 'Client not ready'
        };
    }

    async probe(): Promise<{ ok: boolean; error?: string }> {
        if (!this.client) {
            return { ok: false, error: 'Client not initialized' };
        }
        try {
            const state = await this.client.getState();
            return { ok: state === 'CONNECTED' || state === null }; // null often means connected in wwjs
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }

    async logout(): Promise<void> {
        if (this.client) {
            await this.client.logout();
            this.isReady = false;
        }
    }
}
