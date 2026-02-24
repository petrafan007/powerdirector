// @ts-nocheck
import { Channel, ChannelMessage } from './base.ts';
import { Activity, CloudAdapter, ConfigurationServiceClientCredentialFactory, TurnContext } from 'botbuilder';

function safeTimestampMs(raw: unknown): number {
    if (typeof raw !== 'string' || raw.trim().length === 0) return Date.now();
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : Date.now();
}

export class TeamsChannel implements Channel {
    public name = 'Microsoft Teams';
    public type: 'messaging' = 'messaging';
    public id = 'msteams';

    private readonly adapter: CloudAdapter;
    private readonly appId: string;
    private readonly conversationRefs: Map<string, any> = new Map();
    private messageHandler: ((msg: ChannelMessage) => void) | null = null;
    private lastError?: string;

    constructor(appId: string, appPassword: string) {
        this.appId = appId;
        const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
            MicrosoftAppId: appId,
            MicrosoftAppPassword: appPassword,
            MicrosoftAppType: 'MultiTenant', // Common default
        });

        // @ts-ignore - CloudAdapter types can be finicky depending on version
        this.adapter = new CloudAdapter(credentialsFactory);
    }

    async start(): Promise<void> {
        console.log('Teams channel initialized. Configure Microsoft Bot webhook to POST /api/teams.');
    }

    async stop(): Promise<void> {
        // No-op for adapter
    }

    async send(to: string, message: string): Promise<void> {
        const text = typeof message === 'string' ? message : JSON.stringify(message);
        const conversationReference = this.resolveConversationReference(to);
        await this.adapter.continueConversationAsync(this.appId, conversationReference, async (context: TurnContext) => {
            await context.sendActivity(text);
        });
        this.rememberConversation(conversationReference);
        console.log(`Sent Teams message to ${to}`);
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return { connected: true, running: true, error: this.lastError };
    }

    async probe() {
        // Teams is stateless webhook based, basic probe checks appId presence
        if (!this.appId) return { ok: false, error: 'Missing appId' };
        return { ok: true };
    }

    public async processActivity(activity: Activity, authorization: string = ''): Promise<void> {
        await this.adapter.processActivityDirect(authorization, activity, async (context: TurnContext) => {
            const incoming = context.activity as Activity;
            const conversationReference = TurnContext.getConversationReference(incoming);
            this.rememberConversation(conversationReference);

            if (!this.messageHandler) return;
            if (incoming.type !== 'message') return;

            const text = typeof incoming.text === 'string' ? incoming.text.trim() : '';
            if (!text) return;

            this.messageHandler({
                id: incoming.id || `${Date.now()}`,
                channelId: this.id,
                content: text,
                senderId: incoming.from?.id || 'unknown',
                replyToId: incoming.conversation?.id || '',
                timestamp: safeTimestampMs(incoming.timestamp),
                metadata: {
                    channelId: incoming.channelId,
                    from: incoming.from,
                    conversation: incoming.conversation,
                    conversationReference
                }
            });
        });
    }

    private resolveConversationReference(target: string): any {
        const normalized = typeof target === 'string' ? target.trim() : '';
        if (!normalized) {
            throw new Error('Teams send target is required.');
        }

        const cached = this.conversationRefs.get(normalized);
        if (cached) {
            return cached;
        }

        try {
            const parsed = JSON.parse(normalized);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch {
            // Ignore parse error and continue to explicit error.
        }

        throw new Error(`Unknown Teams conversation target: ${normalized}`);
    }

    private rememberConversation(reference: any): void {
        const conversationId = typeof reference?.conversation?.id === 'string' ? reference.conversation.id : '';
        const userId = typeof reference?.user?.id === 'string' ? reference.user.id : '';
        const botId = typeof reference?.bot?.id === 'string' ? reference.bot.id : '';

        if (conversationId) this.conversationRefs.set(conversationId, reference);
        if (userId) this.conversationRefs.set(userId, reference);
        if (botId) this.conversationRefs.set(botId, reference);
    }
}
