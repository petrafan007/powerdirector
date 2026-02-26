// @ts-nocheck
import { Channel, ChannelMessage } from './base';
import axios from 'axios';

export class BlueBubblesChannel implements Channel {
    public id: string;
    public name = 'imessage-bluebubbles';
    public type: 'messaging' = 'messaging';
    private serverUrl: string;
    private password: string;
    private messageHandler?: (msg: ChannelMessage) => void;
    private pollInterval: NodeJS.Timeout | null = null;
    private lastMessageDate: number = Date.now();

    constructor(serverUrl: string, password: string) {
        this.serverUrl = serverUrl.replace(/\/$/, '');
        this.password = password;
        this.id = `bluebubbles-${serverUrl}`;
    }

    private get params() {
        return { password: this.password };
    }

    async start(): Promise<void> {
        console.log('BlueBubbles iMessage channel started. Polling for new messages...');
        this.lastMessageDate = Date.now();

        this.pollInterval = setInterval(async () => {
            try {
                const res = await axios.post(`${this.serverUrl}/api/v1/message/query`, {
                    limit: 10,
                    offset: 0,
                    sort: 'DESC',
                    after: this.lastMessageDate,
                    with: ['chat', 'handle']
                }, { params: this.params });

                const messages = res.data?.data || [];
                for (const msg of messages) {
                    if (!msg.isFromMe && this.messageHandler) {
                        this.messageHandler({
                            id: msg.guid,
                            channelId: this.id,
                            content: msg.text || '',
                            senderId: msg.handle?.address || 'unknown',
                            replyToId: msg.chats?.[0]?.guid,
                            timestamp: msg.dateCreated,
                            metadata: {
                                chatGuid: msg.chats?.[0]?.guid,
                                isGroup: msg.chats?.[0]?.participants?.length > 2
                            }
                        });
                    }
                    if (msg.dateCreated > this.lastMessageDate) {
                        this.lastMessageDate = msg.dateCreated;
                    }
                }
            } catch (err: any) {
                console.error('BlueBubbles poll error:', err.message);
            }
        }, 3000);
    }

    async stop(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async send(chatGuid: string, content: string | any): Promise<void> {
        const message = typeof content === 'string' ? content : JSON.stringify(content);
        await axios.post(`${this.serverUrl}/api/v1/message/text`, {
            chatGuid,
            message,
            method: 'apple-script'
        }, { params: this.params });
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return { connected: !!this.pollInterval, running: !!this.pollInterval };
    }

    async probe() {
        try {
            await axios.get(`${this.serverUrl}/api/v1/ping`, { params: this.params, timeout: 5000 });
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}
