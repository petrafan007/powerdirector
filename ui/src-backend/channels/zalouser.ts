// @ts-nocheck
import { Channel, ChannelMessage, ChannelType, ChannelClassName } from './base';
import { runZca, runZcaStreaming, parseJsonOutput } from './zalo/zca';

export interface ZaloUserChannelOptions {
    profile?: string;
    dmPolicy?: 'pairing' | 'allowlist' | 'open' | 'disabled';
    allowFrom?: (string | number)[];
    groupPolicy?: 'open' | 'allowlist' | 'disabled';
    groups?: Record<string, { allow?: boolean; enabled?: boolean }>;
}

export class ZaloUserChannel implements Channel {
    public id = 'zalouser';
    public name = 'Zalo Personal';
    public type: ChannelType = 'messaging';
    public className: ChannelClassName = 'ZaloUserChannel';

    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private options: ZaloUserChannelOptions;
    private isRunning = false;
    private abortController: AbortController | null = null;

    constructor(options: ZaloUserChannelOptions) {
        this.options = options;
    }

    async start(): Promise<void> {
        if (this.isRunning) return;

        try {
            console.log(`[ZaloUser] Starting channel for profile: ${this.options.profile || 'default'}`);
            
            // Check if authenticated
            const check = await runZca(['whoami', '-j'], { profile: this.options.profile });
            if (!check.ok) {
                console.warn('[ZaloUser] Not authenticated. Manual login with "zca login" might be required.');
            } else {
                const info = parseJsonOutput<any>(check.stdout);
                console.log(`[ZaloUser] Logged in as: ${info?.displayName || 'Unknown'}`);
            }

            this.isRunning = true;
            this.abortController = new AbortController();
            this.startListener();
        } catch (error: any) {
            // Suppress ENOENT errors if zca binary is missing - avoid restart loop
            if (error?.code === 'ENOENT' || String(error?.message || '').includes('ENOENT')) {
                console.warn('[ZaloUser] zca binary not found. Zalo channel disabled.');
                return;
            }
            console.error('[ZaloUser] Failed to start channel:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        this.isRunning = false;
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        console.log('[ZaloUser] Channel stopped');
    }

    async send(recipientId: string, content: string | any): Promise<void> {
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        
        const args = ['send', '-t', recipientId, '-m', text];
        // If recipientId is a group ID (starts with 'g'), zca might need a flag or handle it automatically
        
        const result = await runZca(args, { profile: this.options.profile });
        if (!result.ok) {
            throw new Error(`ZaloUser send failed: ${result.stderr}`);
        }
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
            const result = await runZca(['whoami'], { profile: this.options.profile });
            return { ok: result.ok, error: result.ok ? undefined : result.stderr };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    }

    private startListener() {
        const { proc, promise } = runZcaStreaming(['listen', '-r', '-k'], {
            profile: this.options.profile,
            onData: (data) => {
                const lines = data.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const msg = JSON.parse(trimmed);
                        this.handleMessage(msg);
                    } catch {
                        // ignore non-json
                    }
                }
            },
            onError: (err: any) => {
                if (this.isRunning) {
                    // Suppress ENOENT spam - avoid repeated error logs if binary is missing
                    if (err?.code === 'ENOENT' || String(err?.message || '').includes('ENOENT')) {
                        console.warn('[ZaloUser] zca binary not found. Zalo channel disabled.');
                        this.isRunning = false;
                        return;
                    }
                    console.error('[ZaloUser] Listener error:', err);
                    setTimeout(() => {
                        if (this.isRunning) this.startListener();
                    }, 5000);
                }
            }
        });

        this.abortController?.signal.addEventListener('abort', () => proc.kill());
    }

    private handleMessage(msg: any) {
        if (!this.messageHandler || !msg.content) return;

        const isGroup = msg.metadata?.isGroup ?? false;
        const senderId = msg.metadata?.fromId ?? msg.threadId;
        const threadId = msg.threadId;

        // Simple policy check
        if (!isGroup) {
            if (this.options.dmPolicy === 'allowlist' && this.options.allowFrom) {
                const allowed = this.options.allowFrom.some(a => String(a) === String(senderId));
                if (!allowed) return;
            }
        } else {
            if (this.options.groupPolicy === 'disabled') return;
        }

        this.messageHandler({
            id: msg.msgId || String(msg.timestamp),
            channelId: this.id,
            content: msg.content,
            senderId: senderId,
            replyToId: isGroup ? threadId : undefined,
            timestamp: msg.timestamp * 1000,
            metadata: msg.metadata
        });
    }
}
