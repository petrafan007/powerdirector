// @ts-nocheck
import { Channel, ChannelMessage } from './base.js';
import { StaticAuthProvider, RefreshingAuthProvider } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import * as fs from 'fs';

export interface TwitchConfig {
    clientId: string;
    accessToken: string;
    clientSecret?: string;
    refreshToken?: string;
    channels: string[]; // List of channels to join
}

export class TwitchChannel implements Channel {
    public id = 'twitch';
    public name = 'Twitch';
    public type: 'messaging' = 'messaging';

    private client: ChatClient | null = null;
    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private config: TwitchConfig;
    private authProvider: any;
    private lastError?: string;

    constructor(config: TwitchConfig) {
        this.config = config;
    }

    async start(): Promise<void> {
        if (this.config.clientSecret && this.config.refreshToken) {
            this.authProvider = new RefreshingAuthProvider({
                clientId: this.config.clientId,
                clientSecret: this.config.clientSecret,
            });
            await this.authProvider.addUserForToken({
                accessToken: this.config.accessToken,
                refreshToken: this.config.refreshToken,
                expiresIn: 0,
                obtainmentTimestamp: 0,
            });
        } else {
            this.authProvider = new StaticAuthProvider(this.config.clientId, this.config.accessToken);
        }

        this.client = new ChatClient({
            authProvider: this.authProvider,
            channels: this.config.channels,
        });

        this.client.onMessage((channel, user, message, msg) => {
            if (this.messageHandler) {
                // Determine if this is a reply or just a message
                const replyParentId = msg.tags.get('reply-parent-msg-id'); // If it's a thread reply

                this.messageHandler({
                    id: msg.id,
                    channelId: this.id,
                    content: message,
                    senderId: user,
                    replyToId: channel, // We reply to the channel usually
                    timestamp: msg.date.getTime(),
                    metadata: {
                        channel,
                        user,
                        tags: Object.fromEntries(msg.tags.entries()),
                        isMod: msg.userInfo.isMod,
                        isSubscriber: msg.userInfo.isSubscriber,
                        replyParentId
                    }
                });
            }
        });

        await this.client.connect();
        this.lastError = undefined;
        console.log(`Twitch channel connected and joined: ${this.config.channels.join(', ')}`);
    } catch (error: any) {
        this.lastError = error.message;
        console.error('Failed to start Twitch Channel:', error);
    }

    async stop(): Promise<void> {
        if (this.client) {
            this.client.quit();
            this.client = null;
        }
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        if (!this.client) {
            throw new Error('Twitch client not connected');
        }

        // recipientId is the channel name (e.g. 'mychannel' or '#mychannel')
        // In some contexts, it might be a user, but for now we assume channel messages.
        // If content is an object, try to extract text.
        const text = typeof content === 'string' ? content : (content.text || JSON.stringify(content));

        await this.client.say(recipientId, text);
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: this.client?.isConnected || false,
            running: !!this.client,
            error: this.lastError
        };
    }

    async probe() {
        if (!this.client) return { ok: false, error: 'Client not initialized' };
        try {
            // Check if auth token is still valid
            await this.authProvider.getAccessToken();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}
