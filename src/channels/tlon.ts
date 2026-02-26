// @ts-nocheck
import { Channel, ChannelMessage, ChannelType, ChannelClassName } from './base.ts';
import { UrbitSSEClient } from './tlon/urbit/sse-client.ts';
import { authenticate } from './tlon/urbit/auth.ts';
import { normalizeShip, parseChannelNest } from './tlon/targets.ts';
import { fetchAllChannels } from './tlon/monitor/discovery.ts';
import { extractMessageText, isBotMentioned, isDmAllowed } from './tlon/monitor/utils.ts';
import { sendDm, sendGroupMessage } from './tlon/urbit/send.ts';

export interface TlonChannelOptions {
    ship: string;
    url: string;
    code: string;
    allowPrivateNetwork?: boolean;
    groupChannels?: string[];
    dmAllowlist?: string[];
    autoDiscoverChannels?: boolean;
    showModelSignature?: boolean;
}

export class TlonChannel implements Channel {
    public id = 'tlon';
    public name = 'Tlon';
    public type: ChannelType = 'messaging';
    public className: ChannelClassName = 'TlonChannel';

    private api: UrbitSSEClient | null = null;
    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private options: TlonChannelOptions;
    private isRunning = false;
    private subscribedChannels = new Set<string>();
    private subscribedDMs = new Set<string>();
    private pollInterval: NodeJS.Timeout | null = null;

    constructor(options: TlonChannelOptions) {
        this.options = options;
    }

    async start(): Promise<void> {
        if (this.isRunning) return;

        try {
            console.log(`[Tlon] Starting channel for ${this.options.ship} at ${this.options.url}`);
            const cookie = await authenticate(this.options.url, this.options.code);
            
            this.api = new UrbitSSEClient(this.options.url, cookie, {
                ship: this.options.ship,
                logger: {
                    log: (msg) => console.log(`[Tlon] ${msg}`),
                    error: (msg) => console.error(`[Tlon] ERROR: ${msg}`)
                }
            });

            await this.setupSubscriptions();
            await this.api.connect();
            
            this.isRunning = true;
            console.log('[Tlon] Channel connected and active');

            this.pollInterval = setInterval(() => this.refreshSubscriptions(), 2 * 60 * 1000);
        } catch (error) {
            console.error('[Tlon] Failed to start channel:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.api) {
            await this.api.close();
            this.api = null;
        }
        this.isRunning = false;
        console.log('[Tlon] Channel stopped');
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        if (!this.api) throw new Error('Channel not started');

        const text = typeof content === 'string' ? content : JSON.stringify(content);
        const botShipName = normalizeShip(this.options.ship);

        if (recipientId.startsWith('chat/')) {
            const parsed = parseChannelNest(recipientId);
            if (parsed) {
                await sendGroupMessage({
                    api: this.api,
                    fromShip: botShipName,
                    hostShip: parsed.hostShip,
                    channelName: parsed.channelName,
                    text
                });
            }
        } else {
            const targetShip = normalizeShip(recipientId);
            await sendDm({
                api: this.api,
                fromShip: botShipName,
                toShip: targetShip,
                text
            });
        }
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: this.api?.isConnected || false,
            running: this.isRunning
        };
    }

    async probe() {
        try {
            await authenticate(this.options.url, this.options.code);
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }

    private async setupSubscriptions() {
        if (!this.api) return;

        // Subscribe to DMs
        try {
            const dmList = await this.api.scry('/chat/dm.json');
            if (Array.isArray(dmList)) {
                for (const dmShip of dmList) {
                    await this.subscribeToDM(dmShip);
                }
            }
        } catch (error) {
            console.error('[Tlon] Failed to fetch DM list:', error);
        }

        // Subscribe to Groups
        let groupChannels = this.options.groupChannels || [];
        if (this.options.autoDiscoverChannels !== false) {
            try {
                const discovered = await fetchAllChannels(this.api, { log: (m) => console.log(`[Tlon] ${m}`) });
                groupChannels = Array.from(new Set([...groupChannels, ...discovered]));
            } catch (error) {
                console.error('[Tlon] Auto-discovery failed:', error);
            }
        }

        for (const channelNest of groupChannels) {
            await this.subscribeToChannel(channelNest);
        }
    }

    private async subscribeToDM(dmShip: string) {
        if (this.subscribedDMs.has(dmShip) || !this.api) return;

        await this.api.subscribe({
            app: 'chat',
            path: `/dm/${dmShip}`,
            event: (data: any) => this.handleIncomingDM(data)
        });
        this.subscribedDMs.add(dmShip);
    }

    private async subscribeToChannel(channelNest: string) {
        if (this.subscribedChannels.has(channelNest) || !this.api) return;

        await this.api.subscribe({
            app: 'channels',
            path: `/${channelNest}`,
            event: (data: any) => this.handleIncomingGroupMessage(channelNest, data)
        });
        this.subscribedChannels.add(channelNest);
    }

    private async refreshSubscriptions() {
        if (!this.api) return;
        await this.setupSubscriptions();
    }

    private handleIncomingDM(update: any) {
        const memo = update?.response?.add?.memo;
        if (!memo || !this.messageHandler) return;

        const senderShip = normalizeShip(memo.author || '');
        if (senderShip === normalizeShip(this.options.ship)) return;

        if (!isDmAllowed(senderShip, this.options.dmAllowlist)) return;

        const text = extractMessageText(memo.content);
        if (!text) return;

        this.messageHandler({
            id: update.id != null ? String(update.id) : `dm-${Date.now()}`,
            channelId: this.id,
            content: text,
            senderId: senderShip,
            timestamp: memo.sent || Date.now(),
            metadata: {
                chatType: 'direct',
                ship: senderShip
            }
        });
    }

    private handleIncomingGroupMessage(channelNest: string, update: any) {
        if (!this.messageHandler) return;

        const post = update?.response?.post?.['r-post'];
        const content = post?.reply?.['r-reply']?.set?.memo || post?.set?.essay;
        if (!content) return;

        const senderShip = normalizeShip(content.author || '');
        const botShipName = normalizeShip(this.options.ship);
        if (senderShip === botShipName) return;

        const text = extractMessageText(content.content);
        if (!text) return;

        // In groups, we often only respond if mentioned
        if (!isBotMentioned(text, botShipName)) return;

        const rawMessageId = post?.reply?.id || update?.response?.post?.id;

        this.messageHandler({
            id: rawMessageId != null ? String(rawMessageId) : `group-${Date.now()}`,
            channelId: this.id,
            content: text,
            senderId: senderShip,
            replyToId: channelNest,
            timestamp: content.sent || Date.now(),
            metadata: {
                chatType: 'group',
                channelNest,
                ship: senderShip
            }
        });
    }
}
