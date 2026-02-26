// @ts-nocheck
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { exec } from 'node:child_process';
import http from 'node:http';
import util from 'node:util';
import { Channel, ChannelMessage } from '../channels/base.ts';
import { NodeManager } from '../nodes/manager.ts';
import { PluginsManager } from '../plugins/manager.ts';
import { CronManager } from '../scheduling/cron.ts';
import { SkillsManager } from '../skills/manager.ts';
import { SessionManager } from '../state/session-manager.ts';
import { Agent } from './agent';
import { ApprovalsManager } from './approvals';
import { BindingsManager, BindingResolution } from './bindings';
import { BroadcastManager } from './broadcast';
import { CanvasHostManager } from './canvas-host';
import { DiscoveryManager } from './discovery';
import { HooksManager } from './hooks';
import { MediaManager } from './media';
import { MemoryManager } from './memory';
import { TalkManager } from './talk';
import { TerminalManager, type TerminalRuntimeOptions } from './terminal';
import { AutoReplyManager, type AutoReplyDecision } from './auto-reply';
import { normalizeToolName, resolveEffectiveAgentToolAllowlist } from '../agents/tool-policy.ts';
import { applyLinkUnderstanding } from '../link-understanding/apply.ts';
import type { LinkToolsConfig } from '../link-understanding/runner.ts';

const execAsync = util.promisify(exec);

type AckReactionScope = 'group-mentions' | 'group-all' | 'direct' | 'all';
type QueueMode = 'steer' | 'followup' | 'collect' | 'steer-backlog' | 'steer+backlog' | 'queue' | 'interrupt';
type QueueDrop = 'old' | 'new' | 'summarize';
type CommandMode = boolean | 'auto';

interface GroupChatPolicy {
    mentionPatterns: string[];
    historyLimit?: number;
}

interface QueuePolicy {
    mode: QueueMode;
    byChannel: Partial<Record<string, QueueMode>>;
    debounceMs: number;
    debounceMsByChannel: Record<string, number>;
    cap: number;
    drop: QueueDrop;
}

interface InboundDebouncePolicy {
    debounceMs: number;
    byChannel: Record<string, number>;
}

interface MessagePolicy {
    messagePrefix: string;
    responsePrefix: string;
    groupChat: GroupChatPolicy;
    queue: QueuePolicy;
    inbound: InboundDebouncePolicy;
    ackReaction: string;
    ackReactionScope: AckReactionScope;
    removeAckAfterReply: boolean;
    suppressToolErrors: boolean;
}

interface CommandPolicy {
    native: CommandMode;
    nativeSkills: CommandMode;
    bash: boolean;
    restart: boolean;
    allowFrom: string[];
    ownerAllowFrom: string[];
    useAccessGroups: boolean;
}

type SessionScope = 'per-sender' | 'global';
type SessionDmScope = 'main' | 'per-peer' | 'per-channel-peer' | 'per-account-channel-peer';
type SessionSendPolicyAction = 'allow' | 'deny';
type SessionSendPolicyChatType = 'direct' | 'group' | 'channel' | 'dm';

interface SessionSendPolicyRule {
    action: SessionSendPolicyAction;
    match?: {
        channel?: string;
        chatType?: SessionSendPolicyChatType;
        keyPrefix?: string;
        rawKeyPrefix?: string;
    };
}

interface SessionSendPolicy {
    default?: SessionSendPolicyAction;
    rules: SessionSendPolicyRule[];
}

interface SessionConfigPolicy {
    scope: SessionScope;
    dmScope: SessionDmScope;
    identityLinks: Record<string, string[]>;
    mainKey: string;
    sendPolicy: SessionSendPolicy;
    idleMinutes?: number;
}

type ChannelAccessPolicy = 'allowlist' | 'open' | 'deny';
type StreamMode = 'on' | 'off' | 'partial' | 'block';

type BlockBreakPreference = 'paragraph' | 'newline' | 'sentence';

interface BlockStreamingChunkConfig {
    breakPreference: BlockBreakPreference;
    minChars: number;
    maxChars: number;
}

interface BlockStreamingCoalesceConfig {
    idleMs: number;
    minChars: number;
    maxChars: number;
}

interface BlockStreamingConfig {
    defaultEnabled: boolean;
    breakMode: 'text_end' | 'message_end';
    chunk: BlockStreamingChunkConfig;
    coalesce: BlockStreamingCoalesceConfig;
}

interface ChannelPolicy {
    enabled: boolean;
    dmPolicy: ChannelAccessPolicy;
    allowFrom: string[];
    groupPolicy: ChannelAccessPolicy;
    streamMode: StreamMode;
    guildIds: string[];
    allowedChannelIds: string[];
}

type GatewayMode = 'local' | 'remote';
type GatewayBind = 'lan' | 'localhost' | '0.0.0.0';
type GatewayAuthMode = 'token' | 'none';
type TailscaleMode = 'off' | 'on' | 'funnel';

interface GatewayAuthRateLimitPolicy {
    maxAttempts: number;
    windowMs: number;
    lockoutMs: number;
    exemptLoopback: boolean;
}

interface GatewayNetworkPolicy {
    port: number;
    mode: GatewayMode;
    bind: GatewayBind;
    disableDeviceAuth: boolean;
    authMode: GatewayAuthMode;
    authToken: string;
    trustedProxies: string[];
    tailscaleMode: TailscaleMode;
    tailscaleResetOnExit: boolean;
    rateLimit: GatewayAuthRateLimitPolicy;
}

interface ToolPolicyConfig {
    tools?: {
        profile?: string;
        allow?: string[];
        alsoAllow?: string[];
        deny?: string[];
    };
    agents?: {
        list?: Array<{
            id?: string;
            tools?: {
                profile?: string;
                allow?: string[];
                alsoAllow?: string[];
                deny?: string[];
            };
        }>;
    };
}

interface GatewaySessionConfigInput {
    scope?: SessionScope;
    dmScope?: SessionDmScope;
    identityLinks?: Record<string, string[]>;
    mainKey?: string;
    sendPolicy?: {
        default?: SessionSendPolicyAction;
        rules?: Array<{
            action?: SessionSendPolicyAction;
            match?: {
                channel?: string;
                chatType?: SessionSendPolicyChatType;
                keyPrefix?: string;
                rawKeyPrefix?: string;
            };
        }>;
    };
    idleMinutes?: number;
}

export interface GatewayOptions {
    messagePolicy?: Partial<MessagePolicy>;
    commandPolicy?: Partial<CommandPolicy>;
    uiPolicy?: any;
    http?: {
        endpoints?: {
            chatCompletions?: {
                enabled?: boolean;
            };
        };
    };
    channelPolicies?: Record<string, Partial<ChannelPolicy>>;
    networkPolicy?: Partial<GatewayNetworkPolicy>;
    nodeManager?: NodeManager;
    cronManager?: CronManager;
    hooksManager?: HooksManager;
    skillsManager?: SkillsManager;
    approvalsManager?: ApprovalsManager;
    bindingsManager?: BindingsManager;
    broadcastManager?: BroadcastManager;
    pluginsManager?: PluginsManager;
    memoryManager?: MemoryManager;
    discoveryManager?: DiscoveryManager;
    canvasHostManager?: CanvasHostManager;
    mediaManager?: MediaManager;
    talkManager?: TalkManager;
    commandCwd?: string;
    commandEnv?: NodeJS.ProcessEnv;
    responseMaxBodyBytes?: number;
    maxConcurrent?: number;
    imageModelHint?: string;
    /** Ordered list of "provider/model" IDs used as the Default fallback chain. When a UI override fails, the router will try these in order. */
    defaultFallbackChain?: string[];
    terminal?: TerminalRuntimeOptions | (() => TerminalRuntimeOptions);
    toolPolicyConfig?: ToolPolicyConfig;
    blockStreamingConfig?: Partial<BlockStreamingConfig>;
    sessionConfig?: GatewaySessionConfigInput;
    linkUnderstandingConfig?: LinkToolsConfig;
}

interface InboundDispatchPayload {
    msg: ChannelMessage;
    binding: BindingResolution | null;
    policy: ChannelPolicy;
    sessionId: string;
    recipient: string;
    channel: Channel | undefined;
}

function resolvePowerDirectorRoot(startDir: string): string {
    let dir = resolvePath(startDir);
    for (let i = 0; i < 12; i += 1) {
        const pkgPath = join(dir, 'package.json');
        const agentPath = join(dir, 'agent');
        if (existsSync(pkgPath) && existsSync(agentPath)) {
            return dir;
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return resolvePath(startDir);
}

const CHAT_RUN_BUFFERS = new Map<string, string>();

export class Gateway {
    private channels: Map<string, Channel> = new Map();
    private readonly activeRunsBySession: Map<string, string> = new Map();
    private readonly abortControllersBySession: Map<string, AbortController> = new Map();
    private started: boolean = false;
    public nodeManager: NodeManager;
    public cronManager: CronManager;
    public hooksManager: HooksManager;
    public skillsManager: SkillsManager;
    public approvalsManager: ApprovalsManager;
    public bindingsManager: BindingsManager;
    public broadcastManager: BroadcastManager;
    public pluginsManager: PluginsManager;
    public memoryManager: MemoryManager;
    public discoveryManager: DiscoveryManager;
    public canvasHostManager: CanvasHostManager;
    public mediaManager: MediaManager;
    public talkManager: TalkManager;
    public autoReplyManager: AutoReplyManager;
    public terminalManager: TerminalManager;
    public sessionManager: SessionManager;
    public agent: Agent;

    private readonly messagePolicy: MessagePolicy;
    private readonly commandPolicy: CommandPolicy;
    private readonly channelPolicies: Record<string, ChannelPolicy>;
    private readonly channelPolicyByChannelId: Map<string, ChannelPolicy> = new Map();
    private readonly networkPolicy: GatewayNetworkPolicy;
    private readonly commandCwd?: string;
    private readonly commandEnv?: NodeJS.ProcessEnv;
    private readonly responseMaxBodyBytes: number;
    private readonly maxConcurrent: number;
    private readonly imageModelHint?: string;
    private readonly defaultFallbackChain: string[];
    private readonly toolPolicyConfig: ToolPolicyConfig;
    private readonly blockStreamingConfig: BlockStreamingConfig;
    private readonly sessionConfig: SessionConfigPolicy;
    private readonly linkUnderstandingConfig: LinkToolsConfig;
    private controlServer: http.Server | null = null;
    private inFlight = 0;
    private queue: Array<() => void> = [];
    private readonly inboundDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private readonly inboundDebouncePending: Map<string, InboundDispatchPayload> = new Map();
    private readonly processingSessions: Set<string> = new Set();
    private readonly queuedMessagesBySession: Map<string, InboundDispatchPayload[]> = new Map();
    private readonly authAttempts: Map<string, { count: number; firstAttempt: number; lockoutUntil?: number }> = new Map();
    private readonly options: GatewayOptions;

    constructor(
        sessionManager: SessionManager,
        agent: Agent,
        options: GatewayOptions = {}
    ) {
        this.options = options;
        this.sessionManager = sessionManager;
        this.agent = agent;
        this.nodeManager = options.nodeManager || new NodeManager();
        this.cronManager = options.cronManager || new CronManager();
        this.hooksManager = options.hooksManager || new HooksManager();
        this.skillsManager = options.skillsManager || new SkillsManager();
        this.approvalsManager = options.approvalsManager || new ApprovalsManager();
        this.bindingsManager = options.bindingsManager || new BindingsManager();
        this.broadcastManager = options.broadcastManager || new BroadcastManager();
        this.pluginsManager = options.pluginsManager || new PluginsManager();
        this.memoryManager = options.memoryManager || new MemoryManager({}, { baseDir: process.cwd() });
        this.discoveryManager = options.discoveryManager || new DiscoveryManager();
        this.canvasHostManager = options.canvasHostManager || new CanvasHostManager();
        this.mediaManager = options.mediaManager || new MediaManager();
        this.talkManager = options.talkManager || new TalkManager();
        this.autoReplyManager = new AutoReplyManager();

        const resolveTerminalOptions = (): TerminalRuntimeOptions => {
            if (typeof options.terminal === 'function') {
                try {
                    return options.terminal() || {};
                } catch (err) {
                    console.warn('[Gateway] Failed to resolve terminal runtime options:', err);
                    return {};
                }
            }
            return options.terminal || {};
        };
        const initialTerminal = resolveTerminalOptions();
        this.terminalManager = new TerminalManager(initialTerminal.port ?? 3008, resolveTerminalOptions);

        const rawQueueByChannel = (
            options.messagePolicy?.queue?.byChannel
            && typeof options.messagePolicy.queue.byChannel === 'object'
            && !Array.isArray(options.messagePolicy.queue.byChannel)
        )
            ? options.messagePolicy.queue.byChannel
            : {};
        const queueByChannel: Partial<Record<string, QueueMode>> = {};
        for (const [channelId, mode] of Object.entries(rawQueueByChannel)) {
            if (
                mode === 'steer'
                || mode === 'followup'
                || mode === 'collect'
                || mode === 'steer-backlog'
                || mode === 'steer+backlog'
                || mode === 'queue'
                || mode === 'interrupt'
            ) {
                queueByChannel[channelId] = mode;
            }
        }

        const rawQueueDebounceByChannel = (
            options.messagePolicy?.queue?.debounceMsByChannel
            && typeof options.messagePolicy.queue.debounceMsByChannel === 'object'
            && !Array.isArray(options.messagePolicy.queue.debounceMsByChannel)
        )
            ? options.messagePolicy.queue.debounceMsByChannel
            : {};
        const queueDebounceByChannel: Record<string, number> = {};
        for (const [channelId, value] of Object.entries(rawQueueDebounceByChannel)) {
            if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
                queueDebounceByChannel[channelId] = Math.floor(value);
            }
        }

        const rawInboundByChannel = (
            options.messagePolicy?.inbound?.byChannel
            && typeof options.messagePolicy.inbound.byChannel === 'object'
            && !Array.isArray(options.messagePolicy.inbound.byChannel)
        )
            ? options.messagePolicy.inbound.byChannel
            : {};
        const inboundByChannel: Record<string, number> = {};
        for (const [channelId, value] of Object.entries(rawInboundByChannel)) {
            if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
                inboundByChannel[channelId] = Math.floor(value);
            }
        }

        const mentionPatterns = Array.isArray(options.messagePolicy?.groupChat?.mentionPatterns)
            ? options.messagePolicy!.groupChat!.mentionPatterns!
                .filter((pattern): pattern is string => typeof pattern === 'string')
                .map((pattern) => pattern.trim())
                .filter((pattern) => pattern.length > 0)
            : [];

        const queueMode = options.messagePolicy?.queue?.mode;
        const resolvedQueueMode: QueueMode = (
            queueMode === 'steer'
            || queueMode === 'followup'
            || queueMode === 'collect'
            || queueMode === 'steer-backlog'
            || queueMode === 'steer+backlog'
            || queueMode === 'queue'
            || queueMode === 'interrupt'
        )
            ? queueMode
            : 'steer-backlog';

        const queueDrop = options.messagePolicy?.queue?.drop;
        const resolvedQueueDrop: QueueDrop = queueDrop === 'new' || queueDrop === 'summarize' ? queueDrop : 'old';

        this.messagePolicy = {
            messagePrefix: String(options.messagePolicy?.messagePrefix || ''),
            responsePrefix: String(options.messagePolicy?.responsePrefix || ''),
            groupChat: {
                mentionPatterns,
                historyLimit: (
                    typeof options.messagePolicy?.groupChat?.historyLimit === 'number'
                    && Number.isFinite(options.messagePolicy.groupChat.historyLimit)
                    && options.messagePolicy.groupChat.historyLimit > 0
                )
                    ? Math.floor(options.messagePolicy.groupChat.historyLimit)
                    : undefined
            },
            queue: {
                mode: resolvedQueueMode,
                byChannel: queueByChannel,
                debounceMs: (
                    typeof options.messagePolicy?.queue?.debounceMs === 'number'
                    && Number.isFinite(options.messagePolicy.queue.debounceMs)
                    && options.messagePolicy.queue.debounceMs >= 0
                )
                    ? Math.floor(options.messagePolicy.queue.debounceMs)
                    : 0,
                debounceMsByChannel: queueDebounceByChannel,
                cap: (
                    typeof options.messagePolicy?.queue?.cap === 'number'
                    && Number.isFinite(options.messagePolicy.queue.cap)
                    && options.messagePolicy.queue.cap > 0
                )
                    ? Math.floor(options.messagePolicy.queue.cap)
                    : 20,
                drop: resolvedQueueDrop
            },
            inbound: {
                debounceMs: (
                    typeof options.messagePolicy?.inbound?.debounceMs === 'number'
                    && Number.isFinite(options.messagePolicy.inbound.debounceMs)
                    && options.messagePolicy.inbound.debounceMs >= 0
                )
                    ? Math.floor(options.messagePolicy.inbound.debounceMs)
                    : 0,
                byChannel: inboundByChannel
            },
            ackReaction: typeof options.messagePolicy?.ackReaction === 'string'
                ? options.messagePolicy.ackReaction
                : '✅',
            ackReactionScope: options.messagePolicy?.ackReactionScope ?? 'group-mentions',
            removeAckAfterReply: options.messagePolicy?.removeAckAfterReply === true,
            suppressToolErrors: options.messagePolicy?.suppressToolErrors === true
        };
        this.commandPolicy = {
            native: options.commandPolicy?.native ?? 'auto',
            nativeSkills: options.commandPolicy?.nativeSkills ?? 'auto',
            bash: options.commandPolicy?.bash ?? true,
            restart: options.commandPolicy?.restart ?? true,
            allowFrom: Array.isArray(options.commandPolicy?.allowFrom) ? options.commandPolicy!.allowFrom : [],
            ownerAllowFrom: Array.isArray(options.commandPolicy?.ownerAllowFrom) ? options.commandPolicy!.ownerAllowFrom : [],
            useAccessGroups: options.commandPolicy?.useAccessGroups ?? false
        };
        this.channelPolicies = this.resolveChannelPolicies(options.channelPolicies || {});
        this.networkPolicy = {
            port: options.networkPolicy?.port ?? 18789,
            mode: options.networkPolicy?.mode ?? 'local',
            bind: options.networkPolicy?.bind ?? 'lan',
            disableDeviceAuth: options.networkPolicy?.disableDeviceAuth ?? false,
            authMode: options.networkPolicy?.authMode ?? 'token',
            authToken: options.networkPolicy?.authToken || '',
            trustedProxies: Array.isArray(options.networkPolicy?.trustedProxies)
                ? options.networkPolicy!.trustedProxies!.filter((x) => typeof x === 'string')
                : [],
            tailscaleMode: options.networkPolicy?.tailscaleMode ?? 'off',
            tailscaleResetOnExit: options.networkPolicy?.tailscaleResetOnExit ?? false,
            rateLimit: {
                maxAttempts: options.networkPolicy?.rateLimit?.maxAttempts ?? 5,
                windowMs: options.networkPolicy?.rateLimit?.windowMs ?? 15 * 60 * 1000,
                lockoutMs: options.networkPolicy?.rateLimit?.lockoutMs ?? 60 * 60 * 1000,
                exemptLoopback: options.networkPolicy?.rateLimit?.exemptLoopback ?? true
            }
        };
        this.commandCwd = options.commandCwd;
        this.commandEnv = options.commandEnv;
        this.responseMaxBodyBytes = options.responseMaxBodyBytes ?? 50 * 1024 * 1024;
        this.maxConcurrent = Math.max(1, options.maxConcurrent ?? 4);
        this.imageModelHint = typeof options.imageModelHint === 'string' && options.imageModelHint.trim().length > 0
            ? options.imageModelHint.trim()
            : undefined;
        this.defaultFallbackChain = Array.isArray(options.defaultFallbackChain)
            ? options.defaultFallbackChain.filter(v => typeof v === 'string' && v.trim().length > 0)
            : [];
        this.toolPolicyConfig = options.toolPolicyConfig || {};
        const chunkCfg: Partial<BlockStreamingChunkConfig> = options.blockStreamingConfig?.chunk || {};
        const coalesceCfg: Partial<BlockStreamingCoalesceConfig> = options.blockStreamingConfig?.coalesce || {};
        const breakPreference = chunkCfg.breakPreference === 'newline' || chunkCfg.breakPreference === 'sentence'
            ? chunkCfg.breakPreference
            : 'paragraph';
        const chunkMax = typeof chunkCfg.maxChars === 'number' && Number.isFinite(chunkCfg.maxChars)
            ? Math.max(1, Math.floor(chunkCfg.maxChars))
            : 1200;
        const chunkMin = typeof chunkCfg.minChars === 'number' && Number.isFinite(chunkCfg.minChars)
            ? Math.max(1, Math.floor(chunkCfg.minChars))
            : 800;
        const coalesceMax = typeof coalesceCfg.maxChars === 'number' && Number.isFinite(coalesceCfg.maxChars)
            ? Math.max(1, Math.floor(coalesceCfg.maxChars))
            : 2000;
        const coalesceMin = typeof coalesceCfg.minChars === 'number' && Number.isFinite(coalesceCfg.minChars)
            ? Math.max(1, Math.floor(coalesceCfg.minChars))
            : 1;

        this.blockStreamingConfig = {
            defaultEnabled: options.blockStreamingConfig?.defaultEnabled === true,
            breakMode: options.blockStreamingConfig?.breakMode === 'message_end' ? 'message_end' : 'text_end',
            chunk: {
                breakPreference,
                minChars: Math.min(chunkMin, chunkMax),
                maxChars: chunkMax
            },
            coalesce: {
                idleMs: typeof coalesceCfg.idleMs === 'number' && Number.isFinite(coalesceCfg.idleMs)
                    ? Math.max(0, Math.floor(coalesceCfg.idleMs))
                    : 1000,
                minChars: Math.min(coalesceMin, coalesceMax),
                maxChars: coalesceMax
            }
        };
        this.sessionConfig = this.normalizeSessionConfig(options.sessionConfig);
        this.linkUnderstandingConfig = options.linkUnderstandingConfig || {};
    }

    public registerChannel(channel: Channel, policyKey?: string) {
        this.channels.set(channel.id, channel);
        const policy = this.resolvePolicyForChannel(channel.id, policyKey);
        this.channelPolicyByChannelId.set(channel.id, policy);
        channel.onMessage(this.handleMessage.bind(this));
        console.log(`Channel registered: ${channel.id} (${channel.type})`);

        if (this.started) {
            channel.start()
                .then(() => console.log(`Started channel: ${channel.id}`))
                .catch((error) => console.error(`Failed to start channel ${channel.id}:`, error));
        }
    }

    public getChannel(channelId: string): Channel | undefined {
        return this.channels.get(channelId);
    }

    public async start() {
        if (this.started) return;
        this.started = true;
        console.log('Starting Gateway...');

        const startPromises = Array.from(this.channels.values()).map(async (channel) => {
            try {
                await channel.start();
                console.log(`Started channel: ${channel.id}`);
            } catch (error) {
                console.error(`Failed to start channel ${channel.id}:`, error);
            }
        });

        await Promise.all(startPromises);

        this.cronManager.startAll();
        await this.startControlServer();
        this.terminalManager.start().catch(err => console.error('Failed to start Terminal:', err));
        await this.applyTailscaleMode();
        await this.discoveryManager.start(this.networkPolicy.port);
        await this.emitHook('gateway.started', {
            port: this.networkPolicy.port,
            mode: this.networkPolicy.mode,
            bind: this.networkPolicy.bind
        });
        console.log('Gateway running.');
    }

    public async stop() {
        if (this.controlServer) {
            await new Promise<void>((resolve) => this.controlServer?.close(() => resolve()));
            this.controlServer = null;
        }

        for (const timer of this.inboundDebounceTimers.values()) {
            clearTimeout(timer);
        }
        this.inboundDebounceTimers.clear();
        this.inboundDebouncePending.clear();
        this.processingSessions.clear();
        this.queuedMessagesBySession.clear();

        this.discoveryManager.stop();
        this.terminalManager.stop();
        await this.resetTailscaleIfNeeded();
        this.cronManager.stopAll();
        await this.emitHook('gateway.stopped', {
            port: this.networkPolicy.port,
            mode: this.networkPolicy.mode
        });

        for (const channel of this.channels.values()) {
            try {
                await channel.stop();
            } catch (error) {
                console.error(`Failed to stop channel ${channel.id}:`, error);
            }
        }
        this.started = false;
    }

    public async processInput(
        initialSessionId: string,
        content: string,
        context: { senderId?: string; channelId?: string; metadata?: any; onStep?: (message: any) => void; runId?: string; appendRunBuffer?: (text: string) => void; continue?: boolean } = {}
    ): Promise<{ output: string; sessionId: string }> {
        let sessionId = initialSessionId;
        const normalizedInputRaw = this.normalizeInput(content);
        const runId = typeof context.runId === 'string' && context.runId.trim().length > 0
            ? context.runId.trim()
            : `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // 🟢 PowerDirector "Magic Stdin" Fix: If the session has a tool WAITING FOR INPUT,
        // redirected the main chat message to that tool instead of starting a new AI turn.
        const sessionData = this.sessionManager.getSession(sessionId);
        const lastMsg = sessionData?.messages[sessionData.messages.length - 1];
        if (lastMsg && lastMsg.metadata?.status === 'running' && lastMsg.metadata?.waitingForInput && lastMsg.metadata?.tool === 'shell') {
            const callId = lastMsg.metadata.callId;
            console.log(`[Gateway] [${sessionId}] Redirection chat input to active terminal (callId: ${callId})`);
            const shellTool = this.agent.getToolRegistry().get('shell') as any;
            if (shellTool) {
                const success = shellTool.writeStdin(callId, content + '\n');
                if (success) {
                    return { output: "Input sent to terminal.", sessionId };
                }
            }
        }

        // CHAT_RUN_BUFFERS requires the definitive runId
        CHAT_RUN_BUFFERS.set(runId, '');

        const senderId = context.senderId || 'unknown';
        const channelId = context.channelId || 'api';
        const binding = this.resolveBindingContext({
            channelId,
            senderId,
            metadata: context.metadata
        });
        const resolvedAgentId = this.resolveAgentId(binding, context.metadata);

        // We use a robust regex to catch /newchat command even with quotes or multiple spaces.
        const newChatRegex = /^["']?\/newchat($|\s|["'])/i;
        if (newChatRegex.test(normalizedInputRaw)) {
            const placeholderMsg: ChannelMessage = {
                id: `cmd_${Date.now()}`,
                channelId,
                senderId,
                content: normalizedInputRaw,
                timestamp: Date.now(),
                metadata: { ...context.metadata, agentId: resolvedAgentId }
            };
            sessionId = await this.resolveSessionId(placeholderMsg, binding);
            console.log(`[Gateway] /newchat detected (Agent: ${resolvedAgentId}); rotating session to ${sessionId}`);
        }

        this.activeRunsBySession.set(sessionId, runId);
        const abortController = new AbortController();
        this.abortControllersBySession.set(sessionId, abortController);

        console.log(`[Gateway] Processing input for session ${sessionId} (runId=${runId}): "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`);

        const effectiveToolAllowlist = this.resolveEffectiveToolAllowlist(binding, resolvedAgentId);
        const normalizeAttachmentForRuntime = (raw: any): any | null => {
            if (!raw || typeof raw !== 'object') {
                return null;
            }

            const fileName = typeof raw.fileName === 'string'
                ? raw.fileName
                : (typeof raw.name === 'string'
                    ? raw.name
                    : (typeof raw.filename === 'string' ? raw.filename : undefined));

            const mimeType = typeof raw.mimeType === 'string'
                ? raw.mimeType
                : (typeof raw.type === 'string' && raw.type.includes('/')
                    ? raw.type
                    : (typeof raw.contentType === 'string' ? raw.contentType : undefined));

            const sizeBytes = typeof raw.sizeBytes === 'number'
                ? raw.sizeBytes
                : (typeof raw.size === 'number' ? raw.size : undefined);

            const data = typeof raw.data === 'string'
                ? raw.data
                : (typeof raw.content === 'string' ? raw.content : undefined);

            let category = typeof raw.category === 'string' ? raw.category : undefined;
            if (!category && typeof mimeType === 'string' && mimeType.startsWith('image/')) {
                category = 'image';
            }

            return {
                ...raw,
                name: fileName ?? raw.name,
                fileName: fileName ?? raw.fileName,
                mimeType,
                sizeBytes,
                data,
                content: data,
                category
            };
        };
        const attachments = Array.isArray(context.metadata?.attachments)
            ? context.metadata.attachments
                .map((att: any) => normalizeAttachmentForRuntime(att))
                .filter(Boolean)
            : [];

        if (attachments.length > 0) {
            const mediaValidation = this.mediaManager.validateUploads(attachments);
            if (!mediaValidation.ok) {
                this.abortControllersBySession.delete(sessionId);
                return { output: mediaValidation.error, sessionId };
            }
        }

        let normalizedInput = this.normalizeInput(content);
        const commandResult = await this.tryHandleCommand(normalizedInput, sessionId, {
            senderId,
            channelId,
            binding,
            metadata: context.metadata,
            agentId: resolvedAgentId,
            toolAllowlist: effectiveToolAllowlist
        });

        if (!commandResult.handled && normalizedInput.toLowerCase().startsWith('/newchat ')) {
            normalizedInput = normalizedInput.slice(9).trim();
        }

        if (commandResult.handled) {
            const output = this.normalizeOutput(commandResult.output);
            this.sessionManager.saveMessage(sessionId, { role: 'user', content: normalizedInput, timestamp: Date.now() });
            this.sessionManager.saveMessage(sessionId, { role: 'assistant', content: output, timestamp: Date.now() });
            this.captureMemory('user', normalizedInput, sessionId, channelId, senderId, resolvedAgentId);
            this.captureMemory('assistant', output, sessionId, channelId, senderId, resolvedAgentId);
            this.abortControllersBySession.delete(sessionId);
            return { output, sessionId };
        }

        let systemPrompt = binding?.systemPrompt || '';

        try {
            const workspaceRoot = resolvePowerDirectorRoot(process.cwd());

            const contextFiles: Array<{ primary: string; fallback?: string }> = [
                { primary: 'AGENTS.md' },
                { primary: 'SOUL.md' },
                { primary: 'TOOLS.md' },
                { primary: 'IDENTITY.md' },
                { primary: 'USER.md' },
                { primary: 'HEARTBEAT.md' },
                { primary: 'MEMORY.md', fallback: 'memory.md' },
                { primary: 'BOOTSTRAP.md' }
            ];
            const contextDir = join(workspaceRoot, 'agent');
            let contextContent = '';
            for (const file of contextFiles) {
                const primaryPath = join(contextDir, file.primary);
                const fallbackPath = file.fallback ? join(contextDir, file.fallback) : null;
                const selectedPath = existsSync(primaryPath)
                    ? primaryPath
                    : (fallbackPath && existsSync(fallbackPath) ? fallbackPath : null);

                if (selectedPath) {
                    contextContent += `\n\n--- [CONTEXT: ${selectedPath}] ---\n${readFileSync(selectedPath, 'utf8')}\n`;
                } else {
                    contextContent += `\n\n--- [CONTEXT: ${primaryPath}] ---\n[MISSING] Expected at: ${primaryPath}\n`;
                }
            }

            if (contextContent) {
                systemPrompt = (systemPrompt ? systemPrompt + '\n' : '') + contextContent;
            }
        } catch (err: any) {
            console.warn(`[Gateway] Failed to load PowerDirector context: ${err.message}`);
        }

        if (this.skillsCommandsEnabled()) {
            const skillsPrompt = this.skillsManager.getSkillsPrompt();
            if (skillsPrompt) {
                systemPrompt = (systemPrompt ? systemPrompt + '\n\n' : '') + skillsPrompt;
            }
        }

        const customInstructions = this.sessionManager.getSessionCustomInstructions(sessionId);
        if (customInstructions) {
            const scopedInstructions = `--- [SESSION CUSTOM INSTRUCTIONS] ---\n${customInstructions}`;
            systemPrompt = (systemPrompt ? systemPrompt + '\n\n' : '') + scopedInstructions;
        }

        const sessionStore = this.sessionManager.getSession(sessionId);
        const sessionMetadata = sessionStore?.session?.metadata || {};
        let activeModelOverride = typeof sessionMetadata.activeModelOverride === 'string' ? sessionMetadata.activeModelOverride : undefined;

        let modelHint = context.metadata?.model;
        if (modelHint === 'default' || modelHint === 'default/default') {
            if (activeModelOverride) {
                console.log(`[Gateway] Clearing sticky session model override for ${sessionId} as 'default' was requested.`);
                this.sessionManager.setSessionMetadata(sessionId, { activeModelOverride: undefined });
                activeModelOverride = undefined;
            }
            modelHint = undefined;
        }
        modelHint = modelHint || activeModelOverride || binding?.model;
        const normalizeReasoningHint = (value: unknown): 'low' | 'medium' | 'high' | 'xhigh' | undefined => {
            if (typeof value !== 'string') return undefined;
            const normalized = value.trim().toLowerCase();
            if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'xhigh') {
                return normalized;
            }
            if (normalized === 'extra high' || normalized === 'extra-high' || normalized === 'extra_high') {
                return 'xhigh';
            }
            return undefined;
        };
        const reasoningHint = normalizeReasoningHint(context.metadata?.reasoning);
        if (attachments.length > 0 && this.imageModelHint) {
            modelHint = this.imageModelHint;
            console.log(`[Gateway] Attachments detected (${attachments.length}); routing to image model ${modelHint}`);
        }

        // When no override is chosen ("Default"), promote primary to modelHint so the
        // router uses the configured chain (primary → fallbacks → others) instead of
        // trying all registered providers in arbitrary registration order.
        let effectiveFallbackChain = this.defaultFallbackChain.length > 0 ? this.defaultFallbackChain : undefined;
        console.log(`[Gateway] Initial modelHint: ${modelHint}, activeModelOverride: ${activeModelOverride}, defaultFallbackChain: [${this.defaultFallbackChain.join(', ')}]`);
        if (!modelHint && effectiveFallbackChain && effectiveFallbackChain.length > 0) {
            modelHint = effectiveFallbackChain[0];
            effectiveFallbackChain = effectiveFallbackChain.slice(1);
            console.log(`[Gateway] Default routing: primary=${modelHint}, chain=[${effectiveFallbackChain?.join(', ')}]`);
        } else if (modelHint) {
            console.log(`[Gateway] Using override modelHint: ${modelHint}, using default fallback chain as-is.`);
        }

        return this.withConcurrency(async () => {
            try {
                const appendRunBuffer = (text: string) => {
                    const cur = CHAT_RUN_BUFFERS.get(runId) ?? '';
                    CHAT_RUN_BUFFERS.set(runId, cur + text);
                };
                const wrappedOnStep = (m: any) => {
                    const enriched = {
                        ...m,
                        sessionId,
                        metadata: { ...m.metadata, runId, sessionId }
                    };
                    if (context.onStep) context.onStep(enriched);
                };

                this.captureMemory('user', normalizedInput, sessionId, channelId, senderId, resolvedAgentId);

                const response = await this.agent.runStep(sessionId, normalizedInput, {
                    agentId: resolvedAgentId,
                    modelHint,
                    reasoningHint,
                    systemPrompt,
                    toolAllowlist: effectiveToolAllowlist,
                    attachments,
                    onStep: wrappedOnStep,
                    appendRunBuffer: context.appendRunBuffer ?? appendRunBuffer,
                    abortSignal: abortController.signal,
                    runId,
                    continue: context.continue,
                    fallbackChain: effectiveFallbackChain && effectiveFallbackChain.length > 0 ? effectiveFallbackChain : undefined,
                    onFallback: (metadata: any) => {
                        const newModel = `${metadata.provider}${metadata.model ? `/${metadata.model}` : ''}`;
                        console.log(`[Gateway] Persisting sticky session model override for ${sessionId}: ${newModel}`);
                        this.sessionManager.setSessionMetadata(sessionId, { activeModelOverride: newModel });
                    }
                });

                const output = this.normalizeOutput(response);
                this.captureMemory('assistant', output, sessionId, channelId, senderId, resolvedAgentId);
                return { output, sessionId };
            } finally {
                const current = this.activeRunsBySession.get(sessionId);
                if (current === runId) {
                    this.activeRunsBySession.delete(sessionId);
                }
                this.abortControllersBySession.delete(sessionId);
                CHAT_RUN_BUFFERS.delete(runId);
            }
        });
    }

    public abortRun(sessionId: string, runId?: string): { ok: boolean; aborted: boolean; runId?: string } {
        const active = this.activeRunsBySession.get(sessionId);
        if (!active) {
            return { ok: true, aborted: false };
        }
        if (runId && active !== runId) {
            return { ok: true, aborted: false, runId: active };
        }

        // Note: We no longer save partialText here because Agent.runStep handles saving the aborted state
        // with proper monotonic sequence numbers and metadata when it catches the abort signal.
        CHAT_RUN_BUFFERS.delete(active);

        // Trigger the session-specific abort controller
        const controller = this.abortControllersBySession.get(sessionId);
        if (controller) {
            console.log(`[Gateway] Aborting session ${sessionId} via AbortController`);
            controller.abort();
            this.abortControllersBySession.delete(sessionId);
        }

        const aborted = this.agent.abortActiveRun('aborted');
        this.activeRunsBySession.delete(sessionId);
        return { ok: true, aborted, runId: active };
    }

    private async handleMessage(msg: ChannelMessage) {
        const binding = this.resolveBindingContext({
            channelId: msg.channelId,
            senderId: msg.senderId,
            replyToId: msg.replyToId,
            metadata: msg.metadata
        });
        await this.emitHook('message.received', {
            channelId: msg.channelId,
            senderId: msg.senderId,
            messageId: msg.id,
            hasReplyTo: Boolean(msg.replyToId),
            boundAgentId: binding?.agentId || 'default'
        });

        console.log(`Gateway received message from ${msg.channelId}: ${msg.content}`);
        const policy = this.getPolicyForMessage(msg);
        if (!this.canProcessMessage(msg, policy)) {
            await this.emitHook('message.blocked', {
                channelId: msg.channelId,
                senderId: msg.senderId,
                messageId: msg.id
            });
            console.log(`Blocked message from ${msg.channelId}/${msg.senderId} by channel policy.`);
            return;
        }

        const sessionId = await this.resolveSessionId(msg, binding);
        const recipient = msg.replyToId || msg.senderId;
        const channel = this.channels.get(msg.channelId);
        const payload: InboundDispatchPayload = {
            msg,
            binding,
            policy,
            sessionId,
            recipient,
            channel
        };

        const inboundDebounceMs = this.resolveInboundDebounceMs(msg.channelId);
        if (inboundDebounceMs <= 0) {
            await this.dispatchInboundPayload(payload);
            return;
        }

        const debounceKey = this.inboundDebounceKey(payload);
        const activeTimer = this.inboundDebounceTimers.get(debounceKey);
        if (activeTimer) {
            clearTimeout(activeTimer);
        }
        this.inboundDebouncePending.set(debounceKey, payload);
        const timer = setTimeout(() => {
            this.inboundDebounceTimers.delete(debounceKey);
            const pending = this.inboundDebouncePending.get(debounceKey);
            if (!pending) return;
            this.inboundDebouncePending.delete(debounceKey);
            this.dispatchInboundPayload(pending).catch((error) => {
                console.error('Failed to dispatch debounced inbound message:', error);
            });
        }, inboundDebounceMs);
        this.inboundDebounceTimers.set(debounceKey, timer);
    }

    private inboundDebounceKey(payload: InboundDispatchPayload): string {
        return [
            payload.sessionId,
            payload.msg.channelId || '',
            payload.msg.senderId || '',
            payload.recipient || ''
        ].join(':');
    }

    private normalizeBindingPeerKind(raw: unknown): 'direct' | 'group' | 'channel' | undefined {
        const value = String(raw || '').trim().toLowerCase();
        if (value === 'direct' || value === 'dm') return 'direct';
        if (value === 'group') return 'group';
        if (value === 'channel') return 'channel';
        return undefined;
    }

    private normalizeBindingPeer(raw: any): { kind: 'direct' | 'group' | 'channel'; id: string } | undefined {
        if (!raw || typeof raw !== 'object') return undefined;
        const kind = this.normalizeBindingPeerKind(raw.kind);
        const id = typeof raw.id === 'string'
            ? raw.id.trim()
            : (typeof raw.id === 'number' || typeof raw.id === 'bigint' ? String(raw.id).trim() : '');
        if (!kind || !id) return undefined;
        return { kind, id };
    }

    private normalizeBindingRoleIds(raw: any): string[] {
        if (!Array.isArray(raw)) return [];
        const roles: string[] = [];
        for (const role of raw) {
            const normalized = typeof role === 'string'
                ? role.trim()
                : (typeof role === 'number' || typeof role === 'bigint' ? String(role).trim() : '');
            if (!normalized) continue;
            roles.push(normalized);
        }
        return roles;
    }

    private resolveBindingContext(params: {
        channelId?: string;
        senderId?: string;
        replyToId?: string;
        metadata?: any;
    }): BindingResolution | null {
        const metadata = params.metadata && typeof params.metadata === 'object'
            ? params.metadata
            : {};
        const channelId = params.channelId || '';
        const guildId = typeof metadata.guildId === 'string'
            ? metadata.guildId.trim()
            : (typeof metadata.guild?.id === 'string' ? metadata.guild.id.trim() : '');
        const teamId = typeof metadata.teamId === 'string'
            ? metadata.teamId.trim()
            : (typeof metadata.team?.id === 'string'
                ? metadata.team.id.trim()
                : (typeof metadata.team === 'string' ? metadata.team.trim() : ''));
        const accountId = typeof metadata.accountId === 'string'
            ? metadata.accountId.trim()
            : (typeof metadata.account?.accountId === 'string'
                ? metadata.account.accountId.trim()
                : (typeof metadata.account?.id === 'string' ? metadata.account.id.trim() : undefined));
        const memberRoleIds = this.normalizeBindingRoleIds(
            metadata.memberRoleIds ?? metadata.member?.roles ?? metadata.roles
        );

        const explicitPeer = this.normalizeBindingPeer(metadata.peer);
        const explicitParentPeer = this.normalizeBindingPeer(metadata.parentPeer);

        const replyPeerKind = this.normalizeBindingPeerKind(metadata.chatType)
            || (guildId || teamId || metadata.isGroup || metadata.roomToken || metadata.roomId ? 'channel' : 'direct');
        const inferredPeer = params.replyToId && params.replyToId.trim().length > 0
            ? { kind: replyPeerKind, id: params.replyToId.trim() }
            : undefined;

        return this.bindingsManager.resolve({
            channelId,
            accountId,
            guildId,
            teamId,
            memberRoleIds,
            peer: explicitPeer || inferredPeer,
            parentPeer: explicitParentPeer,
            metadata
        });
    }

    private normalizeMessageChannelKey(channelId: string): string {
        const lowered = String(channelId || '').trim().toLowerCase();
        if (!lowered) return '';
        if (lowered === 'teams') return 'msteams';
        if (lowered === 'google-chat' || lowered === 'gchat') return 'googlechat';
        return lowered;
    }

    private normalizeSessionConfig(input?: GatewaySessionConfigInput): SessionConfigPolicy {
        const scope: SessionScope = input?.scope === 'global' ? 'global' : 'per-sender';
        const dmScope: SessionDmScope = (
            input?.dmScope === 'main'
            || input?.dmScope === 'per-peer'
            || input?.dmScope === 'per-channel-peer'
            || input?.dmScope === 'per-account-channel-peer'
        )
            ? input.dmScope
            : 'main';
        const mainKey = this.normalizeMainSessionKey(input?.mainKey);

        const identityLinks: Record<string, string[]> = {};
        if (input?.identityLinks && typeof input.identityLinks === 'object') {
            for (const [canonicalRaw, aliasesRaw] of Object.entries(input.identityLinks)) {
                const canonical = this.normalizeIdentityValue(canonicalRaw);
                if (!canonical) continue;
                const aliases = Array.isArray(aliasesRaw)
                    ? aliasesRaw
                        .map((value) => this.normalizeIdentityValue(value))
                        .filter((value): value is string => value.length > 0)
                    : [];
                identityLinks[canonical] = Array.from(new Set([canonical, ...aliases]));
            }
        }

        const rawIdle = input?.idleMinutes;
        const idleMinutes = typeof rawIdle === 'number' && Number.isFinite(rawIdle) && rawIdle > 0 ? rawIdle : 0;

        return {
            scope,
            dmScope,
            identityLinks,
            mainKey,
            sendPolicy: this.normalizeSessionSendPolicy(input?.sendPolicy),
            idleMinutes
        };
    }

    private normalizeSessionSendPolicy(input?: GatewaySessionConfigInput['sendPolicy']): SessionSendPolicy {
        const defaultAction: SessionSendPolicyAction | undefined = input?.default === 'allow' || input?.default === 'deny'
            ? input.default
            : undefined;
        const rules: SessionSendPolicyRule[] = [];

        for (const rawRule of Array.isArray(input?.rules) ? input!.rules! : []) {
            if (!rawRule || typeof rawRule !== 'object') continue;
            const action = rawRule.action === 'allow' || rawRule.action === 'deny'
                ? rawRule.action
                : undefined;
            if (!action) continue;

            const matchRaw = rawRule.match && typeof rawRule.match === 'object'
                ? rawRule.match
                : undefined;
            const channel = this.normalizeIdentityValue(matchRaw?.channel);
            const keyPrefix = this.normalizeIdentityValue(matchRaw?.keyPrefix);
            const rawKeyPrefix = this.normalizeIdentityValue(matchRaw?.rawKeyPrefix);
            const chatType = (
                matchRaw?.chatType === 'direct'
                || matchRaw?.chatType === 'group'
                || matchRaw?.chatType === 'channel'
                || matchRaw?.chatType === 'dm'
            )
                ? matchRaw.chatType
                : undefined;
            const hasMatch = Boolean(channel || keyPrefix || rawKeyPrefix || chatType);

            rules.push({
                action,
                match: hasMatch
                    ? {
                        ...(channel ? { channel } : {}),
                        ...(chatType ? { chatType } : {}),
                        ...(keyPrefix ? { keyPrefix } : {}),
                        ...(rawKeyPrefix ? { rawKeyPrefix } : {})
                    }
                    : undefined
            });
        }

        return { default: defaultAction, rules };
    }

    private normalizeMainSessionKey(value: unknown): string {
        const raw = typeof value === 'string' ? value.trim() : '';
        return raw.length > 0 ? raw : 'main';
    }

    private normalizeIdentityValue(value: unknown): string {
        return typeof value === 'string' ? value.trim().toLowerCase() : '';
    }

    private extractSessionAccountId(metadata: any): string {
        if (!metadata || typeof metadata !== 'object') return '';
        const raw = typeof metadata.accountId === 'string'
            ? metadata.accountId.trim()
            : (
                typeof metadata.account?.accountId === 'string'
                    ? metadata.account.accountId.trim()
                    : (typeof metadata.account?.id === 'string' ? metadata.account.id.trim() : '')
            );
        return raw;
    }

    private resolveCanonicalSessionPeer(channelId: string, peerId: string): string {
        const normalizedPeer = this.normalizeIdentityValue(peerId);
        if (!normalizedPeer) return peerId;
        const candidates = new Set<string>([
            normalizedPeer,
            `${this.normalizeIdentityValue(channelId)}:${normalizedPeer}`
        ]);

        for (const [canonical, aliases] of Object.entries(this.sessionConfig.identityLinks)) {
            const normalizedCanonical = this.normalizeIdentityValue(canonical);
            if (candidates.has(normalizedCanonical)) {
                return canonical;
            }
            for (const alias of aliases || []) {
                const normalizedAlias = this.normalizeIdentityValue(alias);
                if (normalizedAlias && candidates.has(normalizedAlias)) {
                    return canonical;
                }
            }
        }
        return peerId;
    }

    private resolveSessionChatType(msg: ChannelMessage): SessionSendPolicyChatType {
        if (msg.metadata?.guildId || msg.metadata?.teamId || msg.metadata?.roomToken || msg.metadata?.roomId) {
            return 'channel';
        }
        if (msg.metadata?.isGroup || msg.metadata?.chatGuid) {
            return 'group';
        }
        return 'direct';
    }

    private isSessionSendAllowed(msg: ChannelMessage, sessionName: string): boolean {
        const policy = this.sessionConfig.sendPolicy;
        if (!policy.default && policy.rules.length === 0) {
            return true;
        }

        const channel = this.normalizeIdentityValue(msg.channelId);
        const chatType = this.resolveSessionChatType(msg);
        const normalizedSessionName = String(sessionName || '').toLowerCase();

        for (const rule of policy.rules) {
            if (!rule.match) {
                return rule.action === 'allow';
            }
            const match = rule.match;
            if (match.channel) {
                const normalizedMatchChannel = this.normalizeIdentityValue(match.channel);
                if (normalizedMatchChannel && normalizedMatchChannel !== channel) {
                    continue;
                }
            }
            if (match.chatType) {
                const normalizedChatType = match.chatType === 'dm' ? 'direct' : match.chatType;
                if (normalizedChatType !== chatType) {
                    continue;
                }
            }
            if (match.keyPrefix && !normalizedSessionName.startsWith(this.normalizeIdentityValue(match.keyPrefix))) {
                continue;
            }
            if (match.rawKeyPrefix && !normalizedSessionName.startsWith(this.normalizeIdentityValue(match.rawKeyPrefix))) {
                continue;
            }
            return rule.action === 'allow';
        }

        if (policy.default) {
            return policy.default === 'allow';
        }
        return true;
    }

    private resolveInboundDebounceMs(channelId: string): number {
        const normalized = this.normalizeMessageChannelKey(channelId);
        const byChannel = this.messagePolicy.inbound.byChannel || {};
        if (Object.prototype.hasOwnProperty.call(byChannel, normalized)) {
            return Math.max(0, Math.floor(byChannel[normalized] || 0));
        }
        if (Object.prototype.hasOwnProperty.call(byChannel, channelId)) {
            return Math.max(0, Math.floor(byChannel[channelId] || 0));
        }
        return Math.max(0, Math.floor(this.messagePolicy.inbound.debounceMs || 0));
    }

    private resolveQueueMode(channelId: string): QueueMode {
        const normalized = this.normalizeMessageChannelKey(channelId);
        const byChannel = this.messagePolicy.queue.byChannel || {};
        const mode = byChannel[normalized] || byChannel[channelId];
        if (
            mode === 'steer'
            || mode === 'followup'
            || mode === 'collect'
            || mode === 'steer-backlog'
            || mode === 'steer+backlog'
            || mode === 'queue'
            || mode === 'interrupt'
        ) {
            return mode;
        }
        return this.messagePolicy.queue.mode;
    }

    private resolveQueueDebounceMs(channelId: string): number {
        const normalized = this.normalizeMessageChannelKey(channelId);
        const byChannel = this.messagePolicy.queue.debounceMsByChannel || {};
        if (Object.prototype.hasOwnProperty.call(byChannel, normalized)) {
            return Math.max(0, Math.floor(byChannel[normalized] || 0));
        }
        if (Object.prototype.hasOwnProperty.call(byChannel, channelId)) {
            return Math.max(0, Math.floor(byChannel[channelId] || 0));
        }
        return Math.max(0, Math.floor(this.messagePolicy.queue.debounceMs || 0));
    }

    private enqueueInboundPayload(payload: InboundDispatchPayload): void {
        const sessionId = payload.sessionId;
        const queue = this.queuedMessagesBySession.get(sessionId) || [];
        const mode = this.resolveQueueMode(payload.msg.channelId);

        if (mode === 'interrupt') {
            queue.length = 0;
            queue.push(payload);
        } else if (mode === 'collect' && queue.length > 0) {
            const tail = queue[queue.length - 1];
            tail.msg = {
                ...tail.msg,
                content: `${tail.msg.content}\n${payload.msg.content}`,
                timestamp: payload.msg.timestamp
            };
        } else {
            queue.push(payload);
        }

        const cap = Math.max(1, Math.floor(this.messagePolicy.queue.cap || 20));
        while (queue.length > cap) {
            if (this.messagePolicy.queue.drop === 'new') {
                queue.pop();
                break;
            }
            if (this.messagePolicy.queue.drop === 'summarize' && queue.length >= 2) {
                const first = queue.shift();
                if (first && queue[0]) {
                    queue[0].msg = {
                        ...queue[0].msg,
                        content: `${first.msg.content}\n${queue[0].msg.content}`
                    };
                    continue;
                }
            }
            queue.shift();
        }

        this.queuedMessagesBySession.set(sessionId, queue);
    }

    private dequeueInboundPayload(sessionId: string): InboundDispatchPayload | null {
        const queue = this.queuedMessagesBySession.get(sessionId);
        if (!queue || queue.length === 0) return null;
        const next = queue.shift() || null;
        if (queue.length === 0) {
            this.queuedMessagesBySession.delete(sessionId);
        } else {
            this.queuedMessagesBySession.set(sessionId, queue);
        }
        return next;
    }

    private async dispatchInboundPayload(payload: InboundDispatchPayload): Promise<void> {
        const sessionId = payload.sessionId;
        if (this.processingSessions.has(sessionId)) {
            this.enqueueInboundPayload(payload);
            return;
        }

        this.processingSessions.add(sessionId);
        try {
            let current: InboundDispatchPayload | null = payload;
            while (current) {
                await this.processInboundPayload(current);
                const delayMs = this.resolveQueueDebounceMs(current.msg.channelId);
                if (delayMs > 0) {
                    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
                }
                current = this.dequeueInboundPayload(sessionId);
            }
        } finally {
            this.processingSessions.delete(sessionId);
        }
    }

    private async processInboundPayload(payload: InboundDispatchPayload): Promise<void> {
        const { msg, binding, policy, sessionId, recipient, channel } = payload;
        const normalizedInput = this.normalizeInput(msg.content);
        const looksLikeCommand = this.commandsEnabled()
            && normalizedInput.startsWith('/');

        let ackSent = false;
        if (channel && this.shouldSendAck(msg)) {
            await channel.send(recipient, this.messagePolicy.ackReaction || '✅');
            ackSent = true;
        }

        if (channel && !looksLikeCommand) {
            const autoReply = this.autoReplyManager.evaluate({
                message: msg,
                recipientId: recipient
            });
            if (autoReply.matched) {
                await this.handleAutoReplyDecision({
                    decision: autoReply,
                    msg,
                    sessionId,
                    recipient,
                    channel,
                    policy,
                    boundAgentId: binding?.agentId
                });
                if (autoReply.blockAgent) {
                    return;
                }
            }
        }

        if (channel && this.linkUnderstandingConfig.enabled) {
            await applyLinkUnderstanding({
                ctx: { sessionId, message: msg, binding },
                config: this.linkUnderstandingConfig
            });
        }

        const { output, sessionId: effectiveSessionId } = await this.processInput(sessionId, this.applyMessagePrefix(msg.content), {
            senderId: msg.senderId,
            channelId: msg.channelId,
            metadata: msg.metadata
        });

        if (channel) {
            const outbound = this.applyResponsePrefix(this.sanitizeToolErrors(output));
            const sessionRecord = this.sessionManager.getSession(effectiveSessionId);
            const sessionName = typeof sessionRecord?.session?.name === 'string' ? sessionRecord.session.name : '';
            if (!this.isSessionSendAllowed(msg, sessionName)) {
                await this.emitHook('response.blocked', {
                    channelId: msg.channelId,
                    senderId: msg.senderId,
                    recipient,
                    reason: 'session.sendPolicy',
                    sessionName
                });
                return;
            }
            await this.sendToChannel(channel, recipient, outbound, policy);
            if (ackSent && this.messagePolicy.removeAckAfterReply) {
                await this.emitHook('ack.remove.skipped', {
                    channelId: msg.channelId,
                    senderId: msg.senderId,
                    recipient
                });
            }
            await this.emitHook('response.sent', {
                channelId: msg.channelId,
                senderId: msg.senderId,
                recipient,
                responseLength: outbound.length
            });

            if (sessionName.startsWith('session_')) {
                // Strip /newchat from prefix if present
                const newChatRegex = /^\/newchat\s*/i;
                const displayPrompt = normalizedInput.replace(newChatRegex, '').trim() || normalizedInput;
                this.agent.generateSessionTitle(effectiveSessionId, displayPrompt, outbound, msg.metadata?.model).catch(err => {
                    console.error('[Gateway] Failed to trigger session title generation:', err);
                });
            }
        }

        const isGroup = Boolean(
            msg.metadata?.guildId
            || msg.metadata?.isGroup
            || msg.metadata?.roomToken
            || msg.metadata?.chatGuid
        );
        if (isGroup) {
            const limit = this.messagePolicy.groupChat.historyLimit;
            if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
                this.sessionManager.trimSessionHistory(sessionId, limit);
            }
        }
    }

    private async resolveSessionId(msg: ChannelMessage, binding?: BindingResolution | null): Promise<string> {
        const conversationKey = msg.replyToId || msg.senderId;
        const resolvedBinding = binding || this.resolveBindingContext({
            channelId: msg.channelId,
            senderId: msg.senderId,
            replyToId: msg.replyToId,
            metadata: msg.metadata
        });
        const agentId = resolvedBinding?.agentId || 'default';
        const isGroup = this.resolveSessionChatType(msg) !== 'direct';
        const mainKey = this.sessionConfig.mainKey;
        const canonicalPeer = this.resolveCanonicalSessionPeer(msg.channelId, msg.senderId);
        const accountId = this.extractSessionAccountId(msg.metadata);

        let sessionKey = `session_${agentId}_${msg.channelId}_${conversationKey}`;
        if (this.sessionConfig.scope === 'global') {
            sessionKey = `session_${agentId}_${mainKey}`;
        } else if (!isGroup) {
            switch (this.sessionConfig.dmScope) {
                case 'main':
                    sessionKey = `session_${agentId}_${mainKey}`;
                    break;
                case 'per-peer':
                    sessionKey = `session_${agentId}_${canonicalPeer}`;
                    break;
                case 'per-account-channel-peer':
                    sessionKey = `session_${agentId}_${msg.channelId}_${accountId || 'default'}_${canonicalPeer}`;
                    break;
                case 'per-channel-peer':
                default:
                    sessionKey = `session_${agentId}_${msg.channelId}_${canonicalPeer}`;
                    break;
            }
        }

        const sessions = this.sessionManager.listSessions();
        let session = sessions.find(s => s.name === sessionKey);

        if (!session) {
            // Fallback: check metadata for sessionKey (handle renamed sessions)
            session = sessions.find(s => s.metadata?.sessionKey === sessionKey);
        }

        let forceNewSession = false;

        if (typeof msg.content === 'string') {
            const lower = msg.content.trim().toLowerCase();
            if (lower === '/newchat' || lower.startsWith('/newchat ')) {
                forceNewSession = true;
            }
        }

        if (!forceNewSession && session) {
            const idleMinutes = this.sessionConfig.idleMinutes || 0;
            if (idleMinutes > 0) {
                const idleMs = idleMinutes * 60 * 1000;
                if (Date.now() - session.updatedAt > idleMs) {
                    forceNewSession = true;
                }
            }
        }

        if (!session || forceNewSession) {
            session = this.sessionManager.createSession(sessionKey, {
                metadata: { sessionKey }
            });
        }
        return session.id;
    }

    private shouldSendAck(msg: ChannelMessage): boolean {
        if (!this.messagePolicy.ackReaction || this.messagePolicy.ackReaction.trim().length === 0) {
            return false;
        }
        if (this.messagePolicy.ackReactionScope === 'all') return true;
        const isGroup = Boolean(msg.metadata?.guildId || msg.metadata?.isGroup);
        if (this.messagePolicy.ackReactionScope === 'direct') return !isGroup;
        if (this.messagePolicy.ackReactionScope === 'group-all') return isGroup;
        const looksLikeMention = typeof msg.content === 'string' && msg.content.includes('@');
        return isGroup && looksLikeMention;
    }

    private normalizeInput(content: string): string {
        return String(content || '');
    }

    private normalizeOutput(content: string): string {
        let value = String(content || '');

        const byteLength = Buffer.byteLength(value, 'utf8');
        if (byteLength > this.responseMaxBodyBytes) {
            const cut = value.slice(0, Math.max(0, this.responseMaxBodyBytes - 128));
            return `${cut}\n\n[truncated due to gateway max body size]`;
        }
        return value;
    }

    private applyMessagePrefix(content: string): string {
        const prefix = this.messagePolicy.messagePrefix.trim();
        if (!prefix) return content;
        return `${prefix} ${content}`.trim();
    }

    private applyResponsePrefix(content: string): string {
        const prefix = this.messagePolicy.responsePrefix.trim();
        if (!prefix) return content;
        return `${prefix} ${content}`.trim();
    }

    private sanitizeToolErrors(content: string): string {
        if (!this.messagePolicy.suppressToolErrors) {
            return content;
        }
        return content
            .split('\n')
            .filter((line) => !/tool\s+error|tool\s+failed|failed to run tool/i.test(line))
            .join('\n')
            .trim();
    }

    private normalizeRuntimeToolList(list?: string[]): string[] | undefined {
        if (!Array.isArray(list)) return undefined;
        const availableTools = this.agent.listTools();
        const normalizedToOriginal = new Map<string, string>();
        for (const toolName of availableTools) {
            const normalized = normalizeToolName(toolName);
            if (!normalizedToOriginal.has(normalized)) {
                normalizedToOriginal.set(normalized, toolName);
            }
        }

        const seen = new Set<string>();
        const normalizedList: string[] = [];
        for (const raw of list) {
            if (typeof raw !== 'string') continue;
            const trimmed = raw.trim();
            if (!trimmed) continue;
            const normalized = normalizeToolName(trimmed);
            if (!normalized || seen.has(normalized)) continue;
            seen.add(normalized);
            normalizedList.push(normalizedToOriginal.get(normalized) || trimmed);
        }
        return normalizedList;
    }

    private intersectToolAllowlists(left?: string[], right?: string[]): string[] | undefined {
        const normalizedLeft = this.normalizeRuntimeToolList(left);
        const normalizedRight = this.normalizeRuntimeToolList(right);

        if (!normalizedLeft && !normalizedRight) return undefined;
        if (normalizedLeft && !normalizedRight) return normalizedLeft;
        if (!normalizedLeft && normalizedRight) return normalizedRight;

        const leftSet = new Set((normalizedLeft || []).map((name) => normalizeToolName(name)));
        const intersection = (normalizedRight || []).filter((name) => leftSet.has(normalizeToolName(name)));
        return this.normalizeRuntimeToolList(intersection) ?? [];
    }

    private readMetadataAgentId(metadata: any): string | undefined {
        const direct = typeof metadata?.agentId === 'string' ? metadata.agentId.trim() : '';
        if (direct) return direct;
        const bound = typeof metadata?.boundAgentId === 'string' ? metadata.boundAgentId.trim() : '';
        if (bound) return bound;
        const nested = typeof metadata?.agent?.id === 'string' ? metadata.agent.id.trim() : '';
        if (nested) return nested;
        return undefined;
    }

    private resolveAgentId(binding: BindingResolution | null, metadata?: any): string {
        const boundAgent = typeof binding?.agentId === 'string' ? binding.agentId.trim() : '';
        if (boundAgent) return boundAgent;
        return this.readMetadataAgentId(metadata) || 'default';
    }

    private resolveEffectiveToolAllowlist(binding: BindingResolution | null, agentId: string): string[] | undefined {
        const availableTools = this.agent.listTools();
        const configuredAllowlist = resolveEffectiveAgentToolAllowlist({
            config: this.toolPolicyConfig,
            agentId,
            availableTools
        });
        return this.intersectToolAllowlists(configuredAllowlist, binding?.tools);
    }

    private isToolAllowedByAllowlist(toolName: string, allowlist?: string[]): boolean {
        if (!Array.isArray(allowlist)) return true;
        if (allowlist.length === 0) return false;
        const normalized = normalizeToolName(toolName);
        return allowlist.some((allowed) => normalizeToolName(allowed) === normalized);
    }

    private async handleAutoReplyDecision(params: {
        decision: AutoReplyDecision;
        msg: ChannelMessage;
        sessionId: string;
        recipient: string;
        channel: Channel;
        policy: ChannelPolicy;
        boundAgentId?: string;
    }): Promise<void> {
        const { decision, msg, sessionId, recipient, channel, policy, boundAgentId } = params;
        if (typeof decision.response === 'string' && decision.response.trim().length > 0) {
            if (decision.delayMs > 0) {
                await new Promise<void>((resolve) => setTimeout(resolve, decision.delayMs));
            }

            const output = this.applyResponsePrefix(this.sanitizeToolErrors(this.normalizeOutput(decision.response)));
            await this.sendToChannel(channel, recipient, output, policy);
            await this.emitHook('autoreply.sent', {
                channelId: msg.channelId,
                senderId: msg.senderId,
                recipient,
                ruleId: decision.ruleId || '',
                mode: decision.mode || '',
                blockedAgent: decision.blockAgent
            });

            if (decision.blockAgent) {
                this.recordAutoReplyConversation(
                    sessionId,
                    msg,
                    output,
                    boundAgentId
                );
            }
        } else if (decision.blockAgent) {
            await this.emitHook('autoreply.suppressed', {
                channelId: msg.channelId,
                senderId: msg.senderId,
                recipient,
                ruleId: decision.ruleId || '',
                mode: decision.mode || '',
                reason: decision.reason || 'suppressed'
            });
        }
    }

    private recordAutoReplyConversation(
        sessionId: string,
        msg: ChannelMessage,
        output: string,
        agentId?: string
    ): void {
        const normalizedInput = this.normalizeInput(this.applyMessagePrefix(msg.content));
        const now = Date.now();
        this.sessionManager.saveMessage(sessionId, { role: 'user', content: normalizedInput, timestamp: now });
        this.sessionManager.saveMessage(sessionId, { role: 'assistant', content: output, timestamp: now + 1 });
        this.captureMemory('user', normalizedInput, sessionId, msg.channelId, msg.senderId, agentId);
        this.captureMemory('assistant', output, sessionId, msg.channelId, msg.senderId, agentId);
    }

    private formatAutoReplyStatus(prefix: string): string {
        const status = this.autoReplyManager.getStatus();
        return [
            'Auto-Reply:',
            `- effective: ${status.effectiveEnabled ? 'on' : 'off'}`,
            `- configured: ${status.configuredEnabled ? 'on' : 'off'}`,
            `- override: ${status.override}`,
            `- mode: ${status.mode}`,
            `- rules: ${status.activeRules}/${status.totalRules} active`,
            `Commands: ${prefix}autoreply status | ${prefix}autoreply on | ${prefix}autoreply off | ${prefix}autoreply reset | ${prefix}autoreply test <message>`
        ].join('\n');
    }

    private commandsEnabled(): boolean {
        return this.commandPolicy.native !== false;
    }

    private skillsCommandsEnabled(): boolean {
        return this.commandPolicy.nativeSkills !== false;
    }

    private async tryHandleCommand(
        input: string,
        sessionId: string,
        context: {
            senderId: string;
            channelId: string;
            binding: BindingResolution | null;
            metadata?: any;
            agentId: string;
            toolAllowlist?: string[];
        }
    ): Promise<{ handled: boolean; output: string }> {
        if (!this.commandsEnabled()) return { handled: false, output: '' };
        const prefix = '/';
        if (!input.startsWith(prefix)) return { handled: false, output: '' };

        const senderId = context.senderId || 'unknown';
        const isOwner = senderId === 'owner' || (this.commandPolicy.ownerAllowFrom || []).includes(senderId);
        const isAllowed = isOwner || (this.commandPolicy.allowFrom || []).includes(senderId) || (this.commandPolicy.allowFrom || []).length === 0;

        const raw = input.slice(prefix.length).trim();
        if (!raw) return { handled: true, output: 'No command provided. Try /help.' };

        const [command, ...rest] = raw.split(' ');
        const cmd = command.toLowerCase();
        const argText = rest.join(' ').trim();

        // Security check for elevated commands
        if (['bash', 'restart', 'broadcast', 'node', 'plugin', 'skill', 'compact'].includes(cmd)) {
            if (!isAllowed) {
                return { handled: true, output: `Error: Access denied for command "${cmd}". You (ID: ${senderId}) are not in the allowed user list.` };
            }
        }
        if (['restart', 'broadcast'].includes(cmd)) {
            if (!isOwner) {
                return { handled: true, output: `Error: Access denied. Command "${cmd}" is restricted to owners only.` };
            }
        }

        if (cmd === 'newchat') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            if (!argText) {
                return {
                    handled: true,
                    output: 'Created a brand new session context. Send a message to get started.'
                };
            }
            // If there's argText, we essentially want to perform the reset but let the text flow to the agent.
            // We strip the command portion from the input and return handled: false.
            // Note: This relies on the caller using the potentially modified input if we were to return it, 
            // but for now, we'll just allow handled: false and let the agent see the prompt.
            return { handled: false, output: '' };
        }

        if (cmd === 'help') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            return {
                handled: true,
                output: [
                    'Commands:',
                    `${prefix}help`,
                    `${prefix}status`,
                    `${prefix}newchat`,
                    `${prefix}autoreply status|on|off|reset|test <message>`,
                    `${prefix}approvals`,
                    `${prefix}approve <approvalId>`,
                    `${prefix}bash <command>`,
                    `${prefix}restart`,
                    `${prefix}compact (Summarize and replace history)`,
                    `${prefix}node list`,
                    `${prefix}node run <nodeId> <command> [jsonPayload]`,
                    `${prefix}broadcast <message>`,
                    `${prefix}skill list`,
                    `${prefix}skill run <skillId> [input]`,
                    `${prefix}plugin list`,
                    `${prefix}plugin run <pluginId> [input]`,
                    `${prefix}memory status|list [limit]|add <text>|summary [limit]`,
                    `${prefix}media status|validate <jsonUpload>`,
                    `${prefix}talk status|say <text>`,
                    `${prefix}discovery status|probe`,
                    `${prefix}canvas status|open <tool> <jsonArgs>`,
                    `${prefix}tool list`,
                    `${prefix}tool run <toolName> <jsonArgs>`
                ].join('\n')
            };
        }

        if (cmd === 'status') {
            const sessions = this.sessionManager.listSessions();
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            return {
                handled: true,
                output: `Status: ONLINE\nActive Sessions: ${sessions.length}\n${this.formatAutoReplyStatus(prefix)}`
            };
        }

        if (cmd === 'autoreply') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const [subcommandRaw, ...restParts] = argText.split(' ');
            const subcommand = (subcommandRaw || 'status').toLowerCase();
            const testMessage = restParts.join(' ').trim();

            if (subcommand === 'status') {
                return { handled: true, output: this.formatAutoReplyStatus(prefix) };
            }
            if (subcommand === 'on') {
                this.autoReplyManager.setEnabledOverride(true);
                return { handled: true, output: `Auto-reply override set to ON.\n${this.formatAutoReplyStatus(prefix)}` };
            }
            if (subcommand === 'off') {
                this.autoReplyManager.setEnabledOverride(false);
                return { handled: true, output: `Auto-reply override set to OFF.\n${this.formatAutoReplyStatus(prefix)}` };
            }
            if (subcommand === 'reset') {
                this.autoReplyManager.setEnabledOverride(null);
                return { handled: true, output: `Auto-reply override reset to configured value.\n${this.formatAutoReplyStatus(prefix)}` };
            }
            if (subcommand === 'test') {
                if (!testMessage) {
                    return { handled: true, output: `Usage: ${prefix}autoreply test <message>` };
                }
                const decision = this.autoReplyManager.evaluate({
                    message: {
                        id: `autoreply-test-${Date.now()}`,
                        channelId: context.channelId,
                        content: testMessage,
                        senderId: context.senderId,
                        replyToId: context.senderId,
                        timestamp: Date.now()
                    },
                    recipientId: context.senderId
                }, { dryRun: true });
                return { handled: true, output: JSON.stringify(decision, null, 2) };
            }
            return {
                handled: true,
                output: `Usage: ${prefix}autoreply status | ${prefix}autoreply on | ${prefix}autoreply off | ${prefix}autoreply reset | ${prefix}autoreply test <message>`
            };
        }

        if (cmd === 'node') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const [subcommandRaw, ...nodeRest] = argText.split(' ');
            const subcommand = (subcommandRaw || '').toLowerCase();

            if (subcommand === 'list') {
                const nodes = this.nodeManager.getNodes();
                if (nodes.length === 0) {
                    return { handled: true, output: '(no nodes registered)' };
                }
                const lines = nodes.map((node) => {
                    const caps = node.capabilities.length > 0 ? node.capabilities.join(',') : '-';
                    return `${node.id} ${node.name} (${node.platform}) [${node.status}] caps=${caps}`;
                });
                return { handled: true, output: lines.join('\n') };
            }

            if (subcommand === 'run') {
                const [nodeIdRaw, nodeCommandRaw, ...payloadParts] = nodeRest;
                const nodeId = typeof nodeIdRaw === 'string' ? nodeIdRaw.trim() : '';
                const nodeCommand = typeof nodeCommandRaw === 'string' ? nodeCommandRaw.trim() : '';
                if (!nodeId || !nodeCommand) {
                    return { handled: true, output: 'Usage: /node run <nodeId> <command> [jsonPayload]' };
                }

                const payloadText = payloadParts.join(' ').trim();
                let payload: any = {};
                if (payloadText) {
                    try {
                        payload = JSON.parse(payloadText);
                    } catch {
                        return { handled: true, output: 'Invalid JSON payload. Usage: /node run <nodeId> <command> [jsonPayload]' };
                    }
                }

                let timeoutMs: number | undefined;
                if (payload && typeof payload === 'object' && !Array.isArray(payload) && typeof payload.timeoutMs === 'number') {
                    timeoutMs = payload.timeoutMs;
                    if (Object.prototype.hasOwnProperty.call(payload, 'payload')) {
                        payload = payload.payload;
                    } else {
                        const copy = { ...payload };
                        delete copy.timeoutMs;
                        payload = copy;
                    }
                }

                const approvalDenied = this.requireApproval(
                    'node.command',
                    `${nodeId} ${nodeCommand} ${this.truncateForApproval(payloadText)}`,
                    sessionId,
                    context
                );
                if (approvalDenied) {
                    return { handled: true, output: approvalDenied };
                }

                try {
                    const outcome = await this.nodeManager.sendCommand(nodeId, nodeCommand, payload, { timeoutMs });
                    return { handled: true, output: JSON.stringify(outcome, null, 2) };
                } catch (error: any) {
                    return { handled: true, output: `Node command failed: ${error.message}` };
                }
            }

            return { handled: true, output: 'Usage: /node list | /node run <nodeId> <command> [jsonPayload]' };
        }

        if (cmd === 'approvals') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const pending = this.approvalsManager.listPending(context.senderId);
            if (pending.length === 0) {
                return { handled: true, output: '(no pending approvals)' };
            }
            const now = Date.now();
            const lines = pending.map((item) => {
                const seconds = Math.max(0, Math.ceil((item.expiresAt - now) / 1000));
                return `${item.id} [${item.status}] ${item.operation} "${item.detail}" (expires in ${seconds}s)`;
            });
            return { handled: true, output: lines.join('\n') };
        }

        if (cmd === 'approve') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            if (!argText) {
                return { handled: true, output: `Usage: ${prefix}approve <approvalId>` };
            }
            const result = this.approvalsManager.approve(argText, context.senderId);
            return { handled: true, output: result.message };
        }

        if (cmd === 'restart') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            if (!this.commandPolicy.restart) {
                return { handled: true, output: 'Restart command is disabled by settings.' };
            }
            return { handled: true, output: 'Restart command accepted. Manual process restart is required in this build.' };
        }

        if (cmd === 'compact') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const sessionData = this.sessionManager.getSession(sessionId);
            if (!sessionData || sessionData.messages.length < 4) {
                return { handled: true, output: 'Session history is too short to compact.' };
            }

            const historyText = sessionData.messages.map(m => {
                const content = Array.isArray(m.content)
                    ? m.content.map((p: any) => p.type === 'text' ? p.text : '[Image]').join('')
                    : (typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
                return `${m.role.toUpperCase()}: ${content}`;
            }).join('\n\n');

            const prompt = `Please summarize the following conversation history into a concise paragraph that preserves key context, user goals, and important details. This summary will be used to replace the chat history. Focus on what has been achieved and what is currently being discussed.\n\nCONVERSATION:\n${historyText}\n\nSUMMARY:`;

            try {
                const summary = await this.agent.generateCompletion(prompt);
                this.sessionManager.compactSession(sessionId, summary, 0);
                return { handled: true, output: `Session compacted successfully.\n\nSummary: ${summary}` };
            } catch (error: any) {
                return { handled: true, output: `Failed to compact session: ${error.message}` };
            }
        }

        if (cmd === 'bash') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            if (!this.commandPolicy.bash) {
                return { handled: true, output: 'Bash command execution is disabled by settings.' };
            }
            if (!argText) {
                return { handled: true, output: 'Usage: /bash <command>' };
            }
            const approvalDenied = this.requireApproval('bash', argText, sessionId, context);
            if (approvalDenied) {
                return { handled: true, output: approvalDenied };
            }
            const { stdout, stderr } = await execAsync(argText, {
                timeout: 15000,
                cwd: this.commandCwd || undefined,
                env: this.commandEnv
            });
            const output = `${stdout || ''}${stderr || ''}`.trim();
            return { handled: true, output: output || '(no output)' };
        }

        if (cmd === 'tool') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            if (!this.skillsCommandsEnabled()) {
                return { handled: true, output: 'Tool commands are disabled by settings.' };
            }
            if (argText === 'list') {
                const tools = this.agent.listTools();
                const visibleTools = Array.isArray(context.toolAllowlist)
                    ? tools.filter((name) => this.isToolAllowedByAllowlist(name, context.toolAllowlist))
                    : tools;
                return { handled: true, output: visibleTools.join('\n') || '(no tools available by policy)' };
            }

            if (argText.startsWith('run ')) {
                const runBody = argText.slice(4).trim();
                const firstSpace = runBody.indexOf(' ');
                if (firstSpace <= 0) {
                    return { handled: true, output: 'Usage: /tool run <toolName> <jsonArgs>' };
                }
                const toolName = runBody.slice(0, firstSpace).trim();
                const jsonText = runBody.slice(firstSpace + 1).trim();
                if (!this.isToolAllowedByAllowlist(toolName, context.toolAllowlist)) {
                    return {
                        handled: true,
                        output: `Tool "${toolName}" is blocked by runtime policy for agent "${context.agentId}".`
                    };
                }
                let parsedArgs: any = {};
                try {
                    parsedArgs = JSON.parse(jsonText);
                } catch {
                    return { handled: true, output: 'Invalid JSON args. Usage: /tool run <toolName> <jsonArgs>' };
                }
                const approvalDenied = this.requireApproval(
                    'tool.run',
                    `${toolName} ${this.truncateForApproval(jsonText)}`,
                    sessionId,
                    context
                );
                if (approvalDenied) {
                    return { handled: true, output: approvalDenied };
                }
                const output = await this.agent.runTool(toolName, parsedArgs, context.toolAllowlist);
                return { handled: true, output };
            }

            return { handled: true, output: 'Usage: /tool list | /tool run <toolName> <jsonArgs>' };
        }

        if (cmd === 'skill') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            if (!this.skillsCommandsEnabled()) {
                return { handled: true, output: 'Skill commands are disabled by settings.' };
            }

            if (argText === 'list') {
                const skills = this.skillsManager.list();
                if (skills.length === 0) {
                    return { handled: true, output: '(no skills configured)' };
                }

                const lines = skills.map((skill) => {
                    const state = skill.enabled ? 'enabled' : 'disabled';
                    const install = skill.installed ? 'installed' : 'missing';
                    return `${skill.id} (${state}, ${install})`;
                });
                return { handled: true, output: lines.join('\n') };
            }

            if (argText.startsWith('run ')) {
                const runBody = argText.slice(4).trim();
                if (!runBody) {
                    return { handled: true, output: 'Usage: /skill run <skillId> [input]' };
                }

                const firstSpace = runBody.indexOf(' ');
                const skillId = firstSpace === -1 ? runBody : runBody.slice(0, firstSpace).trim();
                const input = firstSpace === -1 ? '' : runBody.slice(firstSpace + 1).trim();
                if (!skillId) {
                    return { handled: true, output: 'Usage: /skill run <skillId> [input]' };
                }

                const approvalDenied = this.requireApproval(
                    'skill.run',
                    `${skillId} ${this.truncateForApproval(input)}`,
                    sessionId,
                    context
                );
                if (approvalDenied) {
                    return { handled: true, output: approvalDenied };
                }

                try {
                    const output = await this.skillsManager.run(skillId, input);
                    return { handled: true, output };
                } catch (error: any) {
                    return { handled: true, output: `Skill run failed: ${error.message}` };
                }
            }

            return { handled: true, output: 'Usage: /skill list | /skill run <skillId> [input]' };
        }

        if (cmd === 'plugin') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            if (!this.skillsCommandsEnabled()) {
                return { handled: true, output: 'Plugin commands are disabled by settings.' };
            }

            if (argText === 'list') {
                const plugins = this.pluginsManager.list();
                if (plugins.length === 0) {
                    return { handled: true, output: '(no plugins configured)' };
                }
                const lines = plugins.map((plugin) => {
                    const state = plugin.enabled ? 'enabled' : 'disabled';
                    const install = plugin.installed ? 'installed' : 'missing';
                    const loaded = plugin.loaded ? 'loaded' : 'not-loaded';
                    return `${plugin.id} (${state}, ${install}, ${loaded})`;
                });
                return { handled: true, output: lines.join('\n') };
            }

            if (argText.startsWith('run ')) {
                const runBody = argText.slice(4).trim();
                if (!runBody) {
                    return { handled: true, output: 'Usage: /plugin run <pluginId> [input]' };
                }

                const firstSpace = runBody.indexOf(' ');
                const pluginId = firstSpace === -1 ? runBody : runBody.slice(0, firstSpace).trim();
                const input = firstSpace === -1 ? '' : runBody.slice(firstSpace + 1).trim();
                if (!pluginId) {
                    return { handled: true, output: 'Usage: /plugin run <pluginId> [input]' };
                }

                const approvalDenied = this.requireApproval(
                    'plugin.run',
                    `${pluginId} ${this.truncateForApproval(input)}`,
                    sessionId,
                    context
                );
                if (approvalDenied) {
                    return { handled: true, output: approvalDenied };
                }

                try {
                    const output = await this.pluginsManager.run(pluginId, input);
                    return { handled: true, output };
                } catch (error: any) {
                    return { handled: true, output: `Plugin run failed: ${error.message}` };
                }
            }

            return { handled: true, output: 'Usage: /plugin list | /plugin run <pluginId> [input]' };
        }

        if (cmd === 'memory') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const [subcommandRaw, ...memoryRest] = argText.split(' ');
            const subcommand = (subcommandRaw || '').toLowerCase();

            if (subcommand === 'status') {
                const status = this.memoryManager.getStatus();
                return { handled: true, output: JSON.stringify(status, null, 2) };
            }

            if (subcommand === 'list') {
                const parsedLimit = Number(memoryRest[0] || '20');
                const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;
                const entries = this.memoryManager.list(limit);
                if (entries.length === 0) {
                    return { handled: true, output: '(no memory entries)' };
                }
                const lines = entries.map((entry) => {
                    const ts = new Date(entry.createdAt).toISOString();
                    return `${entry.id} ${ts} ${entry.text}`;
                });
                return { handled: true, output: lines.join('\n') };
            }

            if (subcommand === 'add') {
                const text = memoryRest.join(' ').trim();
                if (!text) {
                    return { handled: true, output: 'Usage: /memory add <text>' };
                }
                try {
                    const entry = this.memoryManager.add(text, {
                        sessionId,
                        source: 'command',
                        channelId: context.channelId
                    });
                    return { handled: true, output: `Memory added: ${entry.id}` };
                } catch (error: any) {
                    return { handled: true, output: `Memory add failed: ${error.message}` };
                }
            }

            if (subcommand === 'summary' || subcommand === 'summarize') {
                const parsedLimit = Number(memoryRest[0] || '20');
                const limit = Number.isFinite(parsedLimit) ? parsedLimit : 20;
                try {
                    return { handled: true, output: this.memoryManager.summarize(limit) };
                } catch (error: any) {
                    return { handled: true, output: `Memory summary failed: ${error.message}` };
                }
            }

            return { handled: true, output: 'Usage: /memory status | /memory list [limit] | /memory add <text> | /memory summary [limit]' };
        }

        if (cmd === 'media') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const [subcommandRaw, ...mediaRest] = argText.split(' ');
            const subcommand = (subcommandRaw || '').toLowerCase();

            if (subcommand === 'status') {
                return { handled: true, output: JSON.stringify(this.mediaManager.getStatus(), null, 2) };
            }

            if (subcommand === 'validate') {
                const jsonText = mediaRest.join(' ').trim();
                if (!jsonText) {
                    return { handled: true, output: 'Usage: /media validate <jsonUpload>' };
                }
                let payload: any = {};
                try {
                    payload = JSON.parse(jsonText);
                } catch {
                    return { handled: true, output: 'Invalid JSON. Usage: /media validate <jsonUpload>' };
                }
                const result = this.mediaManager.validateUpload(payload || {});
                if (!result.ok) {
                    return { handled: true, output: `Media validation failed: ${result.error}` };
                }
                return { handled: true, output: 'Media validation passed.' };
            }

            return { handled: true, output: 'Usage: /media status | /media validate <jsonUpload>' };
        }

        if (cmd === 'talk') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const [subcommandRaw, ...talkRest] = argText.split(' ');
            const subcommand = (subcommandRaw || '').toLowerCase();

            if (subcommand === 'status') {
                return { handled: true, output: JSON.stringify(this.talkManager.getStatus(), null, 2) };
            }

            if (subcommand === 'say') {
                const text = talkRest.join(' ').trim();
                if (!text) {
                    return { handled: true, output: 'Usage: /talk say <text>' };
                }
                try {
                    const result = await this.talkManager.speak(text);
                    return { handled: true, output: JSON.stringify(result, null, 2) };
                } catch (error: any) {
                    return { handled: true, output: `Talk failed: ${error.message}` };
                }
            }

            return { handled: true, output: 'Usage: /talk status | /talk say <text>' };
        }

        if (cmd === 'discovery') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const sub = (argText.split(' ')[0] || '').toLowerCase();
            if (sub === 'status') {
                return { handled: true, output: JSON.stringify(this.discoveryManager.getStatus(), null, 2) };
            }
            if (sub === 'probe') {
                const result = await this.discoveryManager.probePeers();
                if (result.length === 0) {
                    return { handled: true, output: '(discovery probe returned no results)' };
                }
                return { handled: true, output: JSON.stringify(result, null, 2) };
            }
            return { handled: true, output: 'Usage: /discovery status | /discovery probe' };
        }

        if (cmd === 'canvas') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            const [subcommandRaw, ...canvasRest] = argText.split(' ');
            const subcommand = (subcommandRaw || '').toLowerCase();

            if (subcommand === 'status') {
                return { handled: true, output: JSON.stringify(this.canvasHostManager.getStatus(), null, 2) };
            }

            if (subcommand === 'open') {
                if (canvasRest.length < 1) {
                    return { handled: true, output: 'Usage: /canvas open <tool> <jsonArgs>' };
                }
                const tool = canvasRest[0];
                const jsonText = canvasRest.slice(1).join(' ').trim() || '{}';
                let parsedArgs: any = {};
                try {
                    parsedArgs = JSON.parse(jsonText);
                } catch {
                    return { handled: true, output: 'Invalid JSON args. Usage: /canvas open <tool> <jsonArgs>' };
                }

                try {
                    const launch = this.canvasHostManager.createLaunch({
                        tool,
                        args: parsedArgs,
                        width: typeof parsedArgs.width === 'number' ? parsedArgs.width : undefined,
                        height: typeof parsedArgs.height === 'number' ? parsedArgs.height : undefined
                    });
                    return { handled: true, output: JSON.stringify(launch, null, 2) };
                } catch (error: any) {
                    return { handled: true, output: `Canvas launch failed: ${error.message}` };
                }
            }

            return { handled: true, output: 'Usage: /canvas status | /canvas open <tool> <jsonArgs>' };
        }

        if (cmd === 'broadcast') {
            await this.emitHook('command.executed', { command: cmd, sessionId, args: argText });
            if (!argText) {
                return { handled: true, output: `Usage: ${prefix}broadcast <message>` };
            }
            const approvalDenied = this.requireApproval('broadcast', argText, sessionId, context);
            if (approvalDenied) {
                return { handled: true, output: approvalDenied };
            }

            try {
                const result = await this.broadcastManager.broadcast(argText, this.channels);
                const summary = `Broadcast complete: ${result.succeeded}/${result.attempted} succeeded`;
                if (result.failed === 0) {
                    return { handled: true, output: summary };
                }
                const failureLines = result.failures.map((f) => `- ${f.target}: ${f.error}`);
                return { handled: true, output: `${summary}\nFailures:\n${failureLines.join('\n')}` };
            } catch (error: any) {
                return { handled: true, output: `Broadcast failed: ${error.message}` };
            }
        }

        await this.emitHook('command.executed', { command: cmd, sessionId, args: argText, unknown: true });
        return { handled: true, output: `Unknown command: ${cmd}. Try ${prefix}help.` };
    }

    private requireApproval(
        operation: string,
        detail: string,
        sessionId: string,
        context: { senderId: string; channelId: string; binding: BindingResolution | null }
    ): string | null {
        const decision = this.approvalsManager.evaluate({
            operation,
            detail,
            agentId: context.binding?.agentId,
            senderId: context.senderId,
            sessionId
        });
        if (decision.allowed) return null;

        const suffix = decision.approvalId ? ` (approval id: ${decision.approvalId})` : '';
        return `${decision.reason || 'Action denied by approvals policy.'}${suffix}`;
    }

    private truncateForApproval(value: string, maxLen: number = 240): string {
        const text = String(value || '').trim();
        if (text.length <= maxLen) return text;
        return `${text.slice(0, maxLen)}...[truncated]`;
    }

    private captureMemory(
        role: 'user' | 'assistant',
        text: string,
        sessionId: string,
        channelId: string,
        senderId: string,
        agentId?: string
    ): void {
        try {
            if (!this.memoryManager.isEnabled(agentId)) return;
            this.memoryManager.add(text, {
                role,
                sessionId,
                channelId,
                senderId,
                agentId: agentId || 'default'
            });
        } catch (error) {
            console.warn('Memory capture failed:', error);
        }
    }

    private async withConcurrency<T>(work: () => Promise<T>): Promise<T> {
        if (this.inFlight >= this.maxConcurrent) {
            await new Promise<void>((resolve) => this.queue.push(resolve));
        }

        this.inFlight += 1;
        try {
            return await work();
        } finally {
            this.inFlight -= 1;
            const next = this.queue.shift();
            if (next) next();
        }
    }

    private async startControlServer(): Promise<void> {
        if (this.controlServer?.listening) return;

        const host = this.resolveListenHost();
        const port = this.networkPolicy.port;

        this.controlServer = http.createServer((req, res) => {
            this.handleControlRequest(req, res).catch((error) => {
                console.error('Gateway control request error:', error);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                }
                res.end(JSON.stringify({ error: 'Internal gateway server error' }));
            });
        });

        await new Promise<void>((resolve, reject) => {
            const onListening = () => {
                this.controlServer?.off('error', onError);
                console.log(`Gateway control server listening on ${host}:${port}`);
                resolve();
            };
            const onError = (err: NodeJS.ErrnoException) => {
                this.controlServer?.off('listening', onListening);
                if (err.code === 'EADDRINUSE') {
                    console.warn(`Gateway control port ${port} already in use. Skipping control server startup.`);
                    this.controlServer = null;
                    resolve();
                    return;
                }
                reject(err);
            };

            this.controlServer?.once('listening', onListening);
            this.controlServer?.once('error', onError);
            this.controlServer?.listen(port, host);
        });
    }

    private async handleControlRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '*';
        const allowedOrigins = (this.options.uiPolicy?.allowedOrigins || []);
        const isAllowedOrigin = allowedOrigins.includes(origin) || allowedOrigins.length === 0 || origin === '*' || origin === 'null';

        res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin ? origin : (allowedOrigins[0] || '*'));
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gateway-Token');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const clientIp = this.resolveClientIp(req);
        if (this.networkPolicy.mode === 'local' && !this.isLoopbackIp(clientIp)) {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Gateway is in local mode. Remote requests are blocked.' }));
            return;
        }

        const auth = this.authorizeControlRequest(req, clientIp);
        if (!auth.ok) {
            res.writeHead(auth.status, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: auth.error }));
            return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (pathname === '/health' && req.method === 'GET') {
            const payload = {
                status: 'ok',
                mode: this.networkPolicy.mode,
                bind: this.networkPolicy.bind,
                authMode: this.networkPolicy.authMode,
                channels: Array.from(this.channels.keys()),
                sessions: this.sessionManager.listSessions().length,
                clientIp
            };
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(payload));
            return;
        }

        if (pathname === '/channels/status' && req.method === 'GET') {
            const urlObj = new URL(req.url || '/', `http://${req.headers.host}`);
            const doProbe = urlObj.searchParams.get('probe') === 'true';
            const channelFilterRaw = (urlObj.searchParams.get('channel') || '').trim().toLowerCase();

            const channelsData = await Promise.all(Array.from(this.channels.values()).map(async (c) => {
                let probeResult: { ok: boolean; error?: string } = { ok: true };
                const shouldProbe = doProbe && (!channelFilterRaw || c.id.toLowerCase() === channelFilterRaw);
                if (shouldProbe && typeof c.probe === 'function') {
                    try {
                        probeResult = await c.probe();
                    } catch (e: any) {
                        probeResult = { ok: false, error: e.message };
                    }
                }
                const status = typeof c.getStatus === 'function' ? c.getStatus() : { connected: false, running: false };
                return {
                    id: c.id,
                    name: c.name,
                    enabled: true, // If it's registered, it's enabled in gateway
                    status: status.connected ? 'Active' : 'Error',
                    config: {}, // We don't expose secrets here
                    lastError: status.error,
                    probe: shouldProbe ? probeResult : undefined
                };
            }))
                .then((rows) =>
                    channelFilterRaw
                        ? rows.filter((row) => String(row.id || '').toLowerCase() === channelFilterRaw)
                        : rows
                );

            // Include supported but not registered channels as 'Disabled'
            // This requires reading config again or storing full list. For now, we list active ones.

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ channels: channelsData }));
            return;
        }

        if (pathname === '/channels/logout' && req.method === 'POST') {
            const body = await this.readJsonBody(req);
            const channelId = body.channelId;
            const channel = this.channels.get(channelId);
            if (channel && channel.logout) {
                await channel.logout();
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Channel not found or does not support logout' }));
            }
            return;
        }

        if (pathname === '/status' && req.method === 'GET') {
            const payload = {
                started: this.started,
                inFlight: this.inFlight,
                queueDepth: this.queue.length,
                activeChannels: Array.from(this.channels.keys()),
                sessionCount: this.sessionManager.listSessions().length
            };
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(payload));
            return;
        }

        if (pathname === '/chat' && req.method === 'POST') {
            const chatCompletionsEnabled = this.options.http?.endpoints?.chatCompletions?.enabled ?? true;
            if (!chatCompletionsEnabled) {
                res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Chat completions endpoint is disabled by configuration.' }));
                return;
            }
            const body = await this.readJsonBody(req);
            const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
            const message = typeof body.message === 'string' ? body.message : '';

            if (!sessionId || !message) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Missing sessionId or message' }));
                return;
            }

            const metadataBase = (body && typeof body.metadata === 'object' && !Array.isArray(body.metadata))
                ? { ...body.metadata }
                : {};
            const metadata = {
                ...metadataBase,
                model: typeof body.model === 'string' ? body.model : metadataBase.model,
                reasoning: typeof body.reasoning === 'string' ? body.reasoning : metadataBase.reasoning,
                attachments: Array.isArray(body.attachments) ? body.attachments : metadataBase.attachments,
                agentId: typeof body.agentId === 'string' ? body.agentId : metadataBase.agentId
            };

            const response = await this.processInput(sessionId, message, {
                senderId: typeof body.senderId === 'string' ? body.senderId : clientIp,
                channelId: typeof body.channelId === 'string' ? body.channelId : 'gateway-http',
                metadata
            });

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ response }));
            return;
        }

        if (pathname === '/api/config/ui' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(this.options.uiPolicy || {}));
            return;
        }

        if (pathname === '/api/sessions' && req.method === 'GET') {
            const sessions = this.sessionManager.listSessions();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(sessions));
            return;
        }

        if (pathname === '/api/agents' && req.method === 'GET') {
            // PowerDirector currently uses a single 'Agent' instance with bindings.
            // For CLI compatibility, we return 'default' and any known bound agent IDs from sessions.
            // This is a best-effort list.
            const sessions = this.sessionManager.listSessions();
            const agents = new Set<string>(['default']);
            // Extract agentIds from session names or metadata if available?
            // For now, returning default is sufficient for the basic CLI contract.
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(Array.from(agents)));
            return;
        }

        if (pathname === '/api/memory/search' && req.method === 'POST') {
            const body = await this.readJsonBody(req);
            const query = typeof body.query === 'string' ? body.query : '';
            const agentId = typeof body.agentId === 'string' ? body.agentId : 'default';

            if (!query) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Missing query' }));
                return;
            }

            try {
                const results = await this.memoryManager.search(agentId, query, { maxResults: 20 });
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(results));
            } catch (error: any) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }

    private authorizeControlRequest(
        req: http.IncomingMessage,
        clientIp: string
    ): { ok: true } | { ok: false; status: number; error: string } {
        if (this.networkPolicy.authMode === 'none') {
            return { ok: true };
        }

        const isLoopback = this.isLoopbackIp(clientIp);
        if (this.networkPolicy.disableDeviceAuth && isLoopback) {
            return { ok: true };
        }



        // Rate Limiting
        const limitPolicy = this.networkPolicy.rateLimit;
        const shouldLimit = !(limitPolicy.exemptLoopback && isLoopback);

        if (shouldLimit) {
            const now = Date.now();
            let attempts = this.authAttempts.get(clientIp);

            // Cleanup expired attempts/lockouts
            if (attempts) {
                if (attempts.lockoutUntil && now > attempts.lockoutUntil) {
                    this.authAttempts.delete(clientIp);
                    attempts = undefined;
                } else if (!attempts.lockoutUntil && now > attempts.firstAttempt + limitPolicy.windowMs) {
                    this.authAttempts.delete(clientIp);
                    attempts = undefined;
                }
            }

            if (attempts?.lockoutUntil && now < attempts.lockoutUntil) {
                const remaining = Math.ceil((attempts.lockoutUntil - now) / 1000);
                return {
                    ok: false,
                    status: 429,
                    error: `Too many failed attempts. You are locked out for another ${remaining} seconds.`
                };
            }

            if (attempts && attempts.count >= limitPolicy.maxAttempts) {
                attempts.lockoutUntil = now + limitPolicy.lockoutMs;
                return {
                    ok: false,
                    status: 429,
                    error: `Too many failed attempts. You are locked out.`
                };
            }
        }

        if (!this.networkPolicy.authToken) {
            return {
                ok: false,
                status: 503,
                error: 'Gateway auth.mode is token, but no auth token is configured.'
            };
        }

        const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
        const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : '';
        const rawHeaderToken = typeof req.headers['x-gateway-token'] === 'string'
            ? req.headers['x-gateway-token'].trim()
            : '';
        const providedToken = bearerToken || rawHeaderToken;

        if (providedToken !== this.networkPolicy.authToken) {
            // Track failure
            if (shouldLimit) {
                const now = Date.now();
                let attempts = this.authAttempts.get(clientIp);
                if (!attempts) {
                    attempts = { count: 1, firstAttempt: now };
                    this.authAttempts.set(clientIp, attempts);
                } else {
                    attempts.count += 1;
                    if (attempts.count >= limitPolicy.maxAttempts) {
                        attempts.lockoutUntil = now + limitPolicy.lockoutMs;
                    }
                }
            }

            return {
                ok: false,
                status: 401,
                error: 'Unauthorized: invalid gateway token.'
            };
        }

        // Success: Reset rate limit
        if (shouldLimit) {
            this.authAttempts.delete(clientIp);
        }

        return { ok: true };
    }

    private async readJsonBody(req: http.IncomingMessage, maxBytes: number = 1024 * 1024): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let size = 0;
            let body = '';

            req.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > maxBytes) {
                    reject(new Error('Request body too large'));
                    req.destroy();
                    return;
                }
                body += chunk.toString('utf8');
            });

            req.on('end', () => {
                if (!body.trim()) {
                    resolve({});
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(new Error('Invalid JSON body'));
                }
            });
            req.on('error', (error) => reject(error));
        });
    }

    private resolveListenHost(): string {
        if (this.networkPolicy.mode === 'local') {
            return '127.0.0.1';
        }
        if (this.networkPolicy.bind === 'localhost') {
            return '127.0.0.1';
        }
        return '0.0.0.0';
    }

    private resolveClientIp(req: http.IncomingMessage): string {
        const socketIp = this.normalizeIp(req.socket.remoteAddress || '');
        const trusted = this.networkPolicy.trustedProxies.includes(socketIp);
        if (trusted) {
            const xff = req.headers['x-forwarded-for'];
            const forwarded = typeof xff === 'string' ? xff.split(',')[0]?.trim() : '';
            if (forwarded) {
                return this.normalizeIp(forwarded);
            }
        }
        return socketIp || 'unknown';
    }

    private normalizeIp(raw: string): string {
        const trimmed = raw.trim();
        if (!trimmed) return '';
        if (trimmed === '::1') return '127.0.0.1';
        if (trimmed.startsWith('::ffff:')) return trimmed.slice('::ffff:'.length);
        return trimmed;
    }

    private isLoopbackIp(ip: string): boolean {
        if (!ip) return false;
        return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('127.');
    }

    private async applyTailscaleMode(): Promise<void> {
        if (this.networkPolicy.tailscaleMode === 'off') return;

        try {
            if (this.networkPolicy.tailscaleMode === 'on') {
                await execAsync('tailscale up', { timeout: 15000 });
                console.log('Tailscale mode enabled.');
                return;
            }

            await execAsync(`tailscale funnel ${this.networkPolicy.port}`, { timeout: 15000 });
            console.log(`Tailscale funnel enabled on port ${this.networkPolicy.port}.`);
        } catch (error: any) {
            console.warn(`Failed to apply tailscale mode (${this.networkPolicy.tailscaleMode}): ${error.message}`);
        }
    }

    private async resetTailscaleIfNeeded(): Promise<void> {
        if (!this.networkPolicy.tailscaleResetOnExit || this.networkPolicy.tailscaleMode === 'off') {
            return;
        }

        try {
            if (this.networkPolicy.tailscaleMode === 'funnel') {
                await execAsync('tailscale funnel reset', { timeout: 15000 });
                return;
            }
            await execAsync('tailscale down', { timeout: 15000 });
        } catch (error: any) {
            console.warn(`Failed to reset tailscale on exit: ${error.message}`);
        }
    }

    private resolveChannelPolicies(raw: Record<string, Partial<ChannelPolicy>>): Record<string, ChannelPolicy> {
        const resolved: Record<string, ChannelPolicy> = {};
        for (const [key, value] of Object.entries(raw || {})) {
            const streamMode = value?.streamMode === 'on' || value?.streamMode === 'partial' || value?.streamMode === 'block'
                ? value.streamMode
                : 'off';
            resolved[key] = {
                enabled: value?.enabled ?? true,
                dmPolicy: value?.dmPolicy ?? 'open',
                allowFrom: Array.isArray(value?.allowFrom) ? value.allowFrom.filter((x) => typeof x === 'string') : [],
                groupPolicy: value?.groupPolicy ?? 'open',
                streamMode,
                guildIds: Array.isArray(value?.guildIds) ? value.guildIds.filter((x) => typeof x === 'string') : [],
                allowedChannelIds: Array.isArray(value?.allowedChannelIds)
                    ? value.allowedChannelIds.filter((x) => typeof x === 'string')
                    : []
            };
        }
        return resolved;
    }

    private resolvePolicyForChannel(channelId: string, policyKey?: string): ChannelPolicy {
        if (policyKey && this.channelPolicies[policyKey]) {
            return this.channelPolicies[policyKey];
        }
        if (this.channelPolicies[channelId]) {
            return this.channelPolicies[channelId];
        }
        const lowered = channelId.toLowerCase();
        if (lowered === 'teams' && this.channelPolicies.msteams) return this.channelPolicies.msteams;
        if (lowered === 'msteams' && this.channelPolicies.teams) return this.channelPolicies.teams;
        if (lowered === 'googlechat' && this.channelPolicies.googleChat) return this.channelPolicies.googleChat;
        if (lowered === 'googlechat' && this.channelPolicies['google-chat']) return this.channelPolicies['google-chat'];
        if (lowered.startsWith('nostr-') && this.channelPolicies.nostr) return this.channelPolicies.nostr;
        if (lowered.startsWith('nextcloud-') && this.channelPolicies.nextcloudTalk) return this.channelPolicies.nextcloudTalk;
        if (lowered.startsWith('nextcloud-') && this.channelPolicies['nextcloud-talk']) return this.channelPolicies['nextcloud-talk'];
        if (lowered.startsWith('bluebubbles-') && this.channelPolicies.bluebubbles) return this.channelPolicies.bluebubbles;

        return {
            enabled: true,
            dmPolicy: 'open',
            allowFrom: [],
            groupPolicy: 'open',
            streamMode: 'off',
            guildIds: [],
            allowedChannelIds: []
        };
    }

    private getPolicyForMessage(msg: ChannelMessage): ChannelPolicy {
        return this.channelPolicyByChannelId.get(msg.channelId) || this.resolvePolicyForChannel(msg.channelId);
    }

    private canProcessMessage(msg: ChannelMessage, policy: ChannelPolicy): boolean {
        if (!policy.enabled) return false;

        const replyToId = msg.replyToId || '';
        if (policy.allowedChannelIds.length > 0 && replyToId && !policy.allowedChannelIds.includes(replyToId)) {
            return false;
        }

        const guildId = typeof msg.metadata?.guildId === 'string' ? msg.metadata.guildId : '';
        if (policy.guildIds.length > 0 && guildId && !policy.guildIds.includes(guildId)) {
            return false;
        }

        const isGroup = Boolean(
            msg.metadata?.guildId ||
            msg.metadata?.isGroup ||
            msg.metadata?.roomToken ||
            msg.metadata?.chatGuid
        );
        const senderAllowed = policy.allowFrom.length === 0 || policy.allowFrom.includes(msg.senderId);

        if (!isGroup) {
            if (policy.dmPolicy === 'deny') return false;
            if (policy.dmPolicy === 'allowlist' && !senderAllowed) return false;
        } else {
            if (policy.groupPolicy === 'deny') return false;
            if (policy.groupPolicy === 'allowlist' && !senderAllowed) return false;

            const mentionPatterns = this.messagePolicy.groupChat.mentionPatterns;
            if (mentionPatterns.length > 0) {
                const content = typeof msg.content === 'string' ? msg.content : '';
                const matched = mentionPatterns.some((pattern) => {
                    const candidate = String(pattern || '').trim();
                    if (!candidate) return false;
                    try {
                        return new RegExp(candidate, 'i').test(content);
                    } catch {
                        return content.toLowerCase().includes(candidate.toLowerCase());
                    }
                });
                if (!matched) return false;
            }
        }

        return true;
    }

    public getActiveSessionsCount(): number {
        return this.processingSessions.size;
    }

    public getTotalQueueDepth(): number {
        let total = 0;
        for (const queue of this.queuedMessagesBySession.values()) {
            total += queue.length;
        }
        return total;
    }

    public getActiveAgentsCount(): number {
        return this.activeRunsBySession.size;
    }

    private async sendToChannel(channel: Channel, recipient: string, content: string, policy: ChannelPolicy): Promise<void> {
        const effectiveMode: StreamMode = policy.streamMode === 'block' && this.blockStreamingConfig.defaultEnabled !== true
            ? 'off'
            : policy.streamMode;

        if (effectiveMode === 'off') {
            await channel.send(recipient, content);
            return;
        }

        const chunkCfg = this.blockStreamingConfig.chunk;
        const coalesceCfg = this.blockStreamingConfig.coalesce;
        const chunks = this.chunkTextByPreference(content, {
            breakPreference: chunkCfg.breakPreference,
            minChars: chunkCfg.minChars,
            maxChars: chunkCfg.maxChars
        });
        const toSend = effectiveMode === 'block'
            ? this.coalesceBlocks(chunks, {
                breakPreference: chunkCfg.breakPreference,
                minChars: coalesceCfg.minChars,
                maxChars: coalesceCfg.maxChars
            })
            : chunks;
        const delayMs = effectiveMode === 'block'
            ? Math.min(1500, Math.max(0, coalesceCfg.idleMs))
            : (effectiveMode === 'partial' ? 80 : 30);

        if (toSend.length === 0) {
            await channel.send(recipient, content);
            return;
        }

        for (let i = 0; i < toSend.length; i += 1) {
            await channel.send(recipient, toSend[i]);
            if (i < toSend.length - 1 && delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    }

    private chunkTextByPreference(
        text: string,
        config: { breakPreference: BlockBreakPreference; minChars: number; maxChars: number }
    ): string[] {
        const normalized = String(text || '');
        const maxChars = Math.max(1, Math.floor(config.maxChars || 1));
        if (normalized.length <= maxChars) {
            return [normalized];
        }

        const segments = config.breakPreference === 'sentence'
            ? this.splitBySentences(normalized)
            : (config.breakPreference === 'newline'
                ? this.splitByNewline(normalized)
                : this.splitByParagraph(normalized));

        return this.packSegments(segments, maxChars, config.breakPreference);
    }

    private splitByParagraph(text: string): string[] {
        const parts = text
            .replace(/\r\n?/g, '\n')
            .split(/\n[\t ]*\n+/g)
            .map((part) => part.trim())
            .filter(Boolean);
        return parts.length > 0 ? parts : [text];
    }

    private splitByNewline(text: string): string[] {
        const parts = text
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map((part) => part.trim())
            .filter(Boolean);
        return parts.length > 0 ? parts : [text];
    }

    private splitBySentences(text: string): string[] {
        const normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return [];
        const matches = normalized.match(/[^.!?]+(?:[.!?]+|$)/g) || [];
        const parts = matches.map((segment) => segment.trim()).filter(Boolean);
        return parts.length > 0 ? parts : [normalized];
    }

    private packSegments(segments: string[], maxChars: number, preference: BlockBreakPreference): string[] {
        const joiner = preference === 'sentence'
            ? ' '
            : (preference === 'newline' ? '\n' : '\n\n');
        const out: string[] = [];
        let buffer = '';

        const flush = () => {
            const chunk = buffer.trim();
            if (chunk.length > 0) out.push(chunk);
            buffer = '';
        };

        for (const rawSegment of segments) {
            const segment = rawSegment.trim();
            if (!segment) continue;

            if (segment.length > maxChars) {
                if (buffer) flush();
                out.push(...this.splitByLength(segment, maxChars));
                continue;
            }

            const next = buffer ? `${buffer}${joiner}${segment}` : segment;
            if (next.length > maxChars) {
                if (buffer) flush();
                buffer = segment;
            } else {
                buffer = next;
            }
        }

        if (buffer) flush();
        return out.length > 0 ? out : this.splitByLength(segments.join(joiner), maxChars);
    }

    private splitByLength(text: string, maxChars: number): string[] {
        if (!text) return [];
        if (text.length <= maxChars) return [text];
        const out: string[] = [];
        let remaining = text;
        while (remaining.length > maxChars) {
            const window = remaining.slice(0, maxChars);
            const breakAtWhitespace = Math.max(window.lastIndexOf('\n'), window.lastIndexOf(' '));
            const cut = breakAtWhitespace > 0 ? breakAtWhitespace : maxChars;
            const chunk = remaining.slice(0, cut).trim();
            if (chunk.length > 0) {
                out.push(chunk);
            }
            remaining = remaining.slice(cut).trimStart();
        }
        if (remaining.trim()) {
            out.push(remaining.trim());
        }
        return out;
    }

    private coalesceBlocks(
        chunks: string[],
        config: { breakPreference: BlockBreakPreference; minChars: number; maxChars: number }
    ): string[] {
        if (chunks.length <= 1) return chunks;
        const joiner = config.breakPreference === 'sentence'
            ? ' '
            : (config.breakPreference === 'newline' ? '\n' : '\n\n');
        const minChars = Math.max(1, Math.floor(config.minChars || 1));
        const maxChars = Math.max(minChars, Math.floor(config.maxChars || minChars));

        const out: string[] = [];
        let buffer = '';
        const flush = () => {
            const chunk = buffer.trim();
            if (chunk.length > 0) out.push(chunk);
            buffer = '';
        };

        for (const rawChunk of chunks) {
            const chunk = rawChunk.trim();
            if (!chunk) continue;

            const candidate = buffer ? `${buffer}${joiner}${chunk}` : chunk;
            if (candidate.length > maxChars) {
                if (buffer) flush();
                if (chunk.length > maxChars) {
                    out.push(...this.splitByLength(chunk, maxChars));
                    continue;
                }
                buffer = chunk;
                if (buffer.length >= minChars) {
                    flush();
                }
                continue;
            }
            buffer = candidate;
            if (buffer.length >= maxChars) {
                flush();
            }
        }

        if (buffer) {
            flush();
        }

        return out.length > 0 ? out : chunks;
    }

    private async emitHook(trigger: string, payload: Record<string, any>): Promise<void> {
        try {
            await this.hooksManager.emit(trigger, payload);
        } catch (error) {
            console.warn(`Hook emit failed for trigger "${trigger}":`, error);
        }
    }
}
