// @ts-nocheck
import { Channel, ChannelMessage } from './base.js';

// nostr-tools uses ESM, we need dynamic import
let nostrTools: any = null;

async function getNostrTools() {
    if (!nostrTools) {
        nostrTools = await import('nostr-tools');
    }
    return nostrTools;
}

export class NostrChannel implements Channel {
    public id: string;
    public name = 'nostr';
    public type: 'messaging' = 'messaging';
    private privateKey: Uint8Array | null = null;
    private publicKey: string = '';
    private relayUrls: string[];
    private messageHandler?: (msg: ChannelMessage) => void;
    private relayConnections: any[] = [];
    private privateKeyHex: string;
    private lastError?: string;

    constructor(privateKeyHex: string, relayUrls: string[] = ['wss://relay.damus.io', 'wss://nos.lol']) {
        this.privateKeyHex = privateKeyHex;
        this.relayUrls = relayUrls;
        this.id = `nostr-${privateKeyHex.substring(0, 8)}`;
    }

    async start(): Promise<void> {
        try {
            const { getPublicKey, SimplePool, nip04 } = await getNostrTools();

            const normalizedKey = this.privateKeyHex.replace(/^0x/, '').trim();
            if (!/^[a-fA-F0-9]{64}$/.test(normalizedKey)) {
                throw new Error('Invalid Nostr private key. Expected 64-char hex string.');
            }
            this.privateKey = Uint8Array.from(Buffer.from(normalizedKey, 'hex'));
            this.publicKey = getPublicKey(this.privateKey);

            console.log(`Nostr channel started. Public key: ${this.publicKey.substring(0, 16)}...`);
            console.log(`Connected to relays: ${this.relayUrls.join(', ')}`);

            // Subscribe to DMs (NIP-04)
            const pool = new SimplePool();

            pool.subscribeMany(
                this.relayUrls,
                [{ kinds: [4], '#p': [this.publicKey] }],
                {
                    onevent: async (event: any) => {
                        try {
                            if (this.privateKey) {
                                const decrypted = await nip04.decrypt(this.privateKey, event.pubkey, event.content);
                                if (this.messageHandler) {
                                    this.messageHandler({
                                        id: event.id,
                                        channelId: this.id,
                                        content: decrypted,
                                        senderId: event.pubkey,
                                        replyToId: event.pubkey,
                                        timestamp: event.created_at * 1000,
                                        metadata: { kind: event.kind }
                                    });
                                }
                            }
                        } catch (e: any) {
                            console.error('Nostr decrypt error:', e.message);
                        }
                    }
                }
            );

            this.relayConnections.push(pool);
            this.lastError = undefined;
        } catch (error: any) {
            this.lastError = error.message;
            console.error('Nostr start error:', error.message);
        }
    }

    async stop(): Promise<void> {
        for (const pool of this.relayConnections) {
            try { pool.close(this.relayUrls); } catch { }
        }
        this.relayConnections = [];
    }

    async send(recipientPubkey: string, content: string | any): Promise<void> {
        try {
            const { nip04, SimplePool, finalizeEvent } = await getNostrTools();
            const message = typeof content === 'string' ? content : JSON.stringify(content);

            if (!this.privateKey) throw new Error('Private key not initialized');

            const encrypted = await nip04.encrypt(this.privateKey, recipientPubkey, message);

            const event = finalizeEvent({
                kind: 4,
                created_at: Math.floor(Date.now() / 1000),
                tags: [['p', recipientPubkey]],
                content: encrypted,
            }, this.privateKey);

            const pool = new SimplePool();
            await Promise.all(pool.publish(this.relayUrls, event));
        } catch (error: any) {
            console.error('Nostr send error:', error.message);
        }
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: this.relayConnections.length > 0,
            running: true,
            error: this.lastError
        };
    }

    async probe() {
        try {
            await getNostrTools();
            const normalizedKey = this.privateKeyHex.replace(/^0x/, '').trim();
            if (!/^[a-fA-F0-9]{64}$/.test(normalizedKey)) {
                return { ok: false, error: 'Invalid Nostr private key format.' };
            }
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }
}
