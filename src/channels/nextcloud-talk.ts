// @ts-nocheck
import { Channel, ChannelMessage } from './base.ts';
import axios from 'axios';

export class NextcloudTalkChannel implements Channel {
    public id: string;
    public name = 'nextcloud-talk';
    public type: 'messaging' = 'messaging';
    private baseUrl: string;
    private token: string;
    private messageHandler?: (msg: ChannelMessage) => void;
    private pollInterval: NodeJS.Timeout | null = null;
    private lastError?: string;

    constructor(baseUrl: string, username: string, password: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        // Basic auth token
        this.token = Buffer.from(`${username}:${password}`).toString('base64');
        this.id = `nextcloud-${username}`;
    }

    private get headers() {
        return {
            'Authorization': `Basic ${this.token}`,
            'OCS-APIRequest': 'true',
            'Accept': 'application/json',
        };
    }

    async start(): Promise<void> {
        console.log('Nextcloud Talk channel started. Polling for new messages...');
        // Poll for new messages every 5 seconds
        this.pollInterval = setInterval(async () => {
            try {
                // Get conversations
                const res = await axios.get(
                    `${this.baseUrl}/ocs/v2.php/apps/spreed/api/v4/room`,
                    { headers: this.headers }
                );
                this.lastError = undefined;
                const rooms = res.data?.ocs?.data || [];
                for (const room of rooms) {
                    if (room.unreadMessages > 0 && this.messageHandler) {
                        // Fetch latest messages
                        const msgRes = await axios.get(
                            `${this.baseUrl}/ocs/v2.php/apps/spreed/api/v1/chat/${room.token}?limit=5&lookIntoFuture=0`,
                            { headers: this.headers }
                        );
                        const messages = msgRes.data?.ocs?.data || [];
                        for (const msg of messages) {
                            if (msg.actorType === 'users') {
                                this.messageHandler({
                                    id: String(msg.id),
                                    channelId: this.id,
                                    content: msg.message,
                                    senderId: msg.actorId,
                                    replyToId: room.token,
                                    timestamp: msg.timestamp * 1000,
                                    metadata: { roomToken: room.token, roomName: room.displayName }
                                });
                            }
                        }
                    }
                }
            } catch (err: any) {
                console.error('Nextcloud Talk poll error:', err.message);
            }
        }, 5000);
    }

    async stop(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async send(roomToken: string, content: string | any): Promise<void> {
        const message = typeof content === 'string' ? content : JSON.stringify(content);
        await axios.post(
            `${this.baseUrl}/ocs/v2.php/apps/spreed/api/v1/chat/${roomToken}`,
            { message },
            { headers: this.headers }
        );
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: !!this.pollInterval,
            running: !!this.pollInterval,
            error: this.lastError
        };
    }

    async probe() {
        try {
            await axios.get(`${this.baseUrl}/ocs/v2.php/apps/spreed/api/v4/room`, { headers: this.headers, timeout: 5000 });
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}
