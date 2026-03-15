import fs from 'node:fs';
import path from 'node:path';
import { DatabaseManager } from '@/src-backend/state/db';
import { SessionManager } from '@/src-backend/state/session-manager';
import { UsageManager } from '@/src-backend/state/usage-manager';
import { Agent } from '@/src-backend/core/agent';
import { Gateway } from '@/src-backend/core/gateway';
import { WebRuntimeServer } from '@/src-backend/core/web-runtime';
import { NodeHostServer } from '@/src-backend/core/node-host';
import { ApprovalsManager } from '@/src-backend/core/approvals';
import { BindingsManager } from '@/src-backend/core/bindings';
import { BroadcastManager } from '@/src-backend/core/broadcast';
import { CanvasHostManager } from '@/src-backend/core/canvas-host';
import { DiagnosticsManager } from '@/src-backend/core/diagnostics';
import { DiscoveryManager } from '@/src-backend/core/discovery';
import { HooksManager } from '@/src-backend/core/hooks';
import { getRuntimeLogger, configureRuntimeLogging } from '@/src-backend/core/logger';
import { MediaManager } from '@/src-backend/core/media';
import { MemoryManager } from '@/src-backend/core/memory';
import { TalkManager } from '@/src-backend/core/talk';
import { UpdateDaemon } from '@/src-backend/infra/update-daemon';
import { runGatewayUpdateCheck } from '@/src-backend/infra/update-startup';
import type { TerminalRuntimeOptions } from '@/src-backend/core/terminal';
import { ProviderRouter, Provider } from '@/src-backend/reliability/router';
import { CircuitBreaker } from '@/src-backend/reliability/circuit-breaker';
import { ContextPruner, type ContextPruningConfig } from '@/src-backend/context/pruner';
import { BudgetManager } from '@/src-backend/context/budget';
import { NodeManager } from '@/src-backend/nodes/manager';
import { CronManager, ScheduledTask } from '@/src-backend/scheduling/cron';
import { ToolRegistry } from '@/src-backend/tools/base';
import { AnthropicProvider } from '@/src-backend/providers/anthropic';
import { OpenAIProvider } from '@/src-backend/providers/openai';
import { GeminiProvider } from '@/src-backend/providers/gemini';
import { MinimaxProvider } from '@/src-backend/providers/minimax';
import { OpenAICompatibleProvider } from '@/src-backend/providers/openai-compatible';
import { GeminiCLIProvider, type GeminiCliBackendConfig } from '@/src-backend/providers/gemini-cli';
import { CodexCLIProvider, type CodexCliBackendConfig } from '@/src-backend/providers/codex-cli';
import { PluginsManager } from '@/src-backend/plugins/manager';
import { SkillsManager } from '@/src-backend/skills/manager';
import { loadAuthProfileStore } from './auth-profile-store';
import { resolveAuthCredential } from './auth-resolver';
import { getConfigManager } from './config-instance';
import { resolvePowerDirectorRoot } from './paths';
import { scheduleAppProcessRestart } from './process-restart';
import { resolveServiceWorkspaceDir } from './runtime-defaults';
import { resolveDefaultGeneratedDir, resolveDefaultTmpDir } from '@/src-backend/infra/runtime-paths';

function pickString(...values: Array<string | undefined | null>): string | undefined {
    for (const value of values) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return undefined;
}

function envBool(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return undefined;
}

function envPositiveNumber(value: string | undefined): number | undefined {
    if (typeof value !== 'string') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return parsed;
}

const MODEL_PROVIDER_ALIASES: Record<string, string> = {
    codex: 'openai-codex',
    'codex-cli': 'openai-codex',
    'gemini-cli': 'google-gemini-cli',
};

function normalizeModelProviders(value: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = { ...value };
    for (const [legacyId, canonicalId] of Object.entries(MODEL_PROVIDER_ALIASES)) {
        if (!normalized[canonicalId] && normalized[legacyId]) {
            normalized[canonicalId] = normalized[legacyId];
        }
    }
    return normalized;
}

function isChannelEnabled(configured: any, fallback: boolean): boolean {
    if (typeof configured?.enabled === 'boolean') {
        return configured.enabled;
    }
    return fallback;
}

function normalizeDefaultFallbackEntry(entry: string, params: {
    primaryProvider?: string;
    configuredProviderIds: Set<string>;
}): string {
    const trimmed = entry.trim();
    if (!trimmed || trimmed.includes('/')) {
        return trimmed;
    }
    if (params.configuredProviderIds.has(trimmed.toLowerCase())) {
        return trimmed;
    }
    if (params.primaryProvider) {
        return `${params.primaryProvider}/${trimmed}`;
    }
    return trimmed;
}

function parseDotenvContent(content: string): Record<string, string> {
    const env: Record<string, string> = {};
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex <= 0) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
            value = value.slice(1, -1);
        }
        if (key) env[key] = value;
    }
    return env;
}

function buildRuntimeEnv(config: any, processEnv: NodeJS.ProcessEnv, rootDir: string): Record<string, string | undefined> {
    const shellEnabled = config?.shellEnv?.enabled ?? true;
    const merged: Record<string, string | undefined> = shellEnabled ? { ...processEnv } : {};

    let dotenvPath = pickString(config?.dotenvPath) || path.join(rootDir, '.env');
    if (dotenvPath) {
        if (dotenvPath.startsWith('~/')) {
            dotenvPath = path.join(process.env.HOME || '', dotenvPath.slice(2));
        }

        if (fs.existsSync(dotenvPath)) {
            const stats = fs.statSync(dotenvPath);
            if (stats.isDirectory()) {
                dotenvPath = path.join(dotenvPath, '.env');
            }

            if (fs.existsSync(dotenvPath)) {
                try {
                    const parsed = parseDotenvContent(fs.readFileSync(dotenvPath, 'utf-8'));
                    for (const [k, v] of Object.entries(parsed)) merged[k] = v;
                } catch (err: any) {
                    console.warn(`Failed to parse dotenv file at ${dotenvPath}: ${err.message}`);
                }
            }
        }
    }

    const custom = config?.customEnvVars || {};
    for (const [k, v] of Object.entries(custom)) {
        if (typeof v === 'string') merged[k] = v;
    }

    return merged;
}

function toProcessEnvMap(env: Record<string, string | undefined>): NodeJS.ProcessEnv {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
            out[key] = value;
        }
    }
    return out as NodeJS.ProcessEnv;
}

function normalizeLookupKey(value: string | undefined | null): string {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
}

function resolvePreferredProviderOrder(agentDefaults: any, modelProviders: Record<string, any>): string[] {
    const providerLookup = new Map<string, string>();

    for (const [providerId, cfg] of Object.entries(modelProviders || {})) {
        const normalizedProviderId = normalizeLookupKey(providerId);
        if (!normalizedProviderId) continue;

        const addCandidate = (candidate: any) => {
            const key = normalizeLookupKey(typeof candidate === 'string' ? candidate : '');
            if (key && !providerLookup.has(key)) {
                providerLookup.set(key, normalizedProviderId);
            }
        };

        addCandidate(providerId);
        addCandidate(cfg?.name);
        addCandidate(cfg?.defaultModel);
        for (const model of Array.isArray(cfg?.models) ? cfg.models : []) {
            addCandidate(model?.name);
            addCandidate(model?.alias);
        }
    }

    const agentModelAliases = new Map<string, string>();
    const agentModels = (agentDefaults?.models && typeof agentDefaults.models === 'object')
        ? agentDefaults.models
        : {};
    for (const [modelKey, rawModelConfig] of Object.entries(agentModels)) {
        const normalizedModelKey = normalizeLookupKey(modelKey);
        if (normalizedModelKey) {
            agentModelAliases.set(normalizedModelKey, modelKey);
        }
        const alias = normalizeLookupKey((rawModelConfig as any)?.alias);
        if (alias) {
            agentModelAliases.set(alias, modelKey);
        }
    }

    const resolveProvider = (raw: string): string | undefined => {
        let token = normalizeLookupKey(raw);
        if (!token) return undefined;

        // If the token is a full provider/model path, try the provider part first
        if (token.includes('/')) {
            const providerPart = token.split('/')[0];
            const direct = providerLookup.get(providerPart);
            if (direct) return direct;
        }

        const seen = new Set<string>();
        for (let i = 0; i < 4; i += 1) {
            const direct = providerLookup.get(token);
            if (direct) return direct;

            if (seen.has(token)) break;
            seen.add(token);

            const aliased = agentModelAliases.get(token);
            if (!aliased) break;
            token = normalizeLookupKey(aliased);
        }

        const finalToken = providerLookup.get(token);
        if (finalToken) return finalToken;

        // Fallback: if it looks like a provider/model but wasn't in the lookup,
        // just return the provider part as a guess.
        if (raw.includes('/')) {
            return normalizeLookupKey(raw.split('/')[0]);
        }
        return undefined;
    };

    const ordered: string[] = [];
    const addPreference = (raw: any) => {
        if (typeof raw !== 'string') return;
        const resolved = resolveProvider(raw) || normalizeLookupKey(raw);
        if (!resolved) return;
        if (!ordered.includes(resolved)) {
            ordered.push(resolved);
        }
    };

    addPreference(agentDefaults?.model?.primary);
    for (const fallback of Array.isArray(agentDefaults?.model?.fallbacks) ? agentDefaults.model.fallbacks : []) {
        addPreference(fallback);
    }

    return ordered;
}

function asPositiveNumber(value: any): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    if (value <= 0) return undefined;
    return value;
}

type CliBackendCommonConfig = {
    command?: string;
    args?: string[];
    output?: 'json' | 'text' | 'jsonl';
    resumeOutput?: 'json' | 'text' | 'jsonl';
    input?: 'arg' | 'stdin';
    maxPromptArgChars?: number;
    env?: Record<string, string>;
    clearEnv?: string[];
    modelArg?: string;
    modelAliases?: Record<string, string>;
    imageArg?: string;
    imageMode?: 'repeat' | 'list';
    serialize?: boolean;
};

function sanitizeStringArray(value: any): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const cleaned = value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    return cleaned.length > 0 ? cleaned : undefined;
}

function sanitizeStringRecord(value: any): Record<string, string> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const cleaned: Record<string, string> = {};
    for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'string' && key.trim()) {
            cleaned[key.trim()] = val;
        }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function sanitizeCliBackendConfig(raw: any): CliBackendCommonConfig | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const output = raw.output === 'json' || raw.output === 'text' || raw.output === 'jsonl'
        ? raw.output
        : undefined;
    const resumeOutput = raw.resumeOutput === 'json' || raw.resumeOutput === 'text' || raw.resumeOutput === 'jsonl'
        ? raw.resumeOutput
        : undefined;
    const input = raw.input === 'arg' || raw.input === 'stdin'
        ? raw.input
        : undefined;
    const imageMode = raw.imageMode === 'list' || raw.imageMode === 'repeat'
        ? raw.imageMode
        : undefined;

    const command = typeof raw.command === 'string' && raw.command.trim().length > 0
        ? raw.command.trim()
        : undefined;
    const modelArg = typeof raw.modelArg === 'string' && raw.modelArg.trim().length > 0
        ? raw.modelArg.trim()
        : undefined;
    const imageArg = typeof raw.imageArg === 'string' && raw.imageArg.trim().length > 0
        ? raw.imageArg.trim()
        : undefined;
    const maxPromptArgChars = typeof raw.maxPromptArgChars === 'number' && Number.isFinite(raw.maxPromptArgChars) && raw.maxPromptArgChars > 0
        ? Math.floor(raw.maxPromptArgChars)
        : undefined;

    const cleaned: CliBackendCommonConfig = {
        command,
        args: sanitizeStringArray(raw.args),
        output,
        resumeOutput,
        input,
        maxPromptArgChars,
        env: sanitizeStringRecord(raw.env),
        clearEnv: sanitizeStringArray(raw.clearEnv),
        modelArg,
        modelAliases: sanitizeStringRecord(raw.modelAliases),
        imageArg,
        imageMode,
        serialize: typeof raw.serialize === 'boolean' ? raw.serialize : undefined
    };

    const hasAny = Object.values(cleaned).some((value) => value !== undefined);
    return hasAny ? cleaned : undefined;
}

function normalizeBackendId(value: string): string {
    return normalizeLookupKey(value);
}

type CodexReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

function normalizeCodexReasoningEffort(value: unknown): CodexReasoningEffort | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'xhigh') {
        return normalized;
    }
    if (normalized === 'extra high' || normalized === 'extra-high' || normalized === 'extra_high') {
        return 'xhigh';
    }
    return undefined;
}

function normalizeConfiguredModelKey(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const slash = trimmed.indexOf('/');
    if (slash === -1) return undefined;
    const providerRaw = normalizeLookupKey(trimmed.slice(0, slash));
    const model = trimmed.slice(slash + 1).trim();
    if (!providerRaw || !model) return undefined;
    const provider = MODEL_PROVIDER_ALIASES[providerRaw] || providerRaw;
    return `${provider}/${model}`;
}

function resolveCodexReasoningConfig(config: any): {
    defaultReasoningEffort?: CodexReasoningEffort;
    modelReasoningEfforts?: Record<string, CodexReasoningEffort>;
} {
    const providers = normalizeModelProviders((config?.models?.providers || {}) as Record<string, any>);
    const providerDefault = normalizeCodexReasoningEffort(providers['openai-codex']?.defaultReasoningEffort);
    const rawEntries = (config?.agents?.defaults?.models && typeof config.agents.defaults.models === 'object')
        ? config.agents.defaults.models as Record<string, any>
        : {};

    const modelReasoningEfforts: Record<string, CodexReasoningEffort> = {};
    for (const [rawKey, entry] of Object.entries(rawEntries)) {
        const normalizedKey = normalizeConfiguredModelKey(rawKey);
        if (!normalizedKey || !normalizedKey.startsWith('openai-codex/')) {
            continue;
        }
        const override = normalizeCodexReasoningEffort((entry as any)?.reasoningEffort);
        if (override) {
            modelReasoningEfforts[normalizedKey.toLowerCase()] = override;
        }
    }

    return {
        defaultReasoningEffort: providerDefault,
        modelReasoningEfforts: Object.keys(modelReasoningEfforts).length > 0 ? modelReasoningEfforts : undefined,
    };
}

function resolveCliBackendConfig(agentDefaults: any, candidates: string[]): CliBackendCommonConfig | undefined {
    const configured = (agentDefaults?.cliBackends && typeof agentDefaults.cliBackends === 'object')
        ? agentDefaults.cliBackends as Record<string, any>
        : {};
    if (Object.keys(configured).length === 0) return undefined;

    const normalizedCandidates = candidates.map((candidate) => normalizeBackendId(candidate)).filter(Boolean);
    for (const [backendId, backendConfig] of Object.entries(configured)) {
        const normalizedBackendId = normalizeBackendId(backendId);
        if (!normalizedBackendId || !normalizedCandidates.includes(normalizedBackendId)) {
            continue;
        }
        return sanitizeCliBackendConfig(backendConfig);
    }
    return undefined;
}

function toGeminiCliBackendConfig(config?: CliBackendCommonConfig): GeminiCliBackendConfig | undefined {
    if (!config) return undefined;
    return {
        command: config.command,
        args: config.args,
        output: config.output,
        input: config.input,
        maxPromptArgChars: config.maxPromptArgChars,
        env: config.env,
        clearEnv: config.clearEnv,
        modelArg: config.modelArg,
        modelAliases: config.modelAliases,
        imageArg: config.imageArg,
        imageMode: config.imageMode
    };
}

function toCodexCliBackendConfig(config?: CliBackendCommonConfig): CodexCliBackendConfig | undefined {
    if (!config) return undefined;
    return {
        command: config.command,
        args: config.args,
        input: config.input,
        maxPromptArgChars: config.maxPromptArgChars,
        env: config.env,
        clearEnv: config.clearEnv,
        modelArg: config.modelArg,
        modelAliases: config.modelAliases
    };
}

function resolveModelSelection(providerCfg: any, requestedModel: string): { model: string; entry?: any } {
    const normalizedRequested = normalizeLookupKey(requestedModel);
    const models = Array.isArray(providerCfg?.models) ? providerCfg.models : [];
    const matched = models.find((model: any) => {
        const name = normalizeLookupKey(model?.name);
        const alias = normalizeLookupKey(model?.alias);
        return normalizedRequested.length > 0 && (name === normalizedRequested || alias === normalizedRequested);
    });

    if (matched && typeof matched.name === 'string' && matched.name.trim().length > 0) {
        return { model: matched.name.trim(), entry: matched };
    }

    if (requestedModel.trim().length > 0) {
        return { model: requestedModel.trim() };
    }

    const first = models.find((model: any) => typeof model?.name === 'string' && model.name.trim().length > 0);
    if (first) {
        return { model: first.name.trim(), entry: first };
    }

    return { model: requestedModel.trim() };
}

function toCronTask(rawJob: any, index: number): ScheduledTask {
    const name = typeof rawJob?.name === 'string' && rawJob.name.trim().length > 0
        ? rawJob.name.trim()
        : `Job ${index + 1}`;
    const action = rawJob?.action === 'command' || rawJob?.action === 'webhook'
        ? rawJob.action
        : 'message';
    const payload = typeof rawJob?.payload === 'string'
        ? rawJob.payload
        : (typeof rawJob?.command === 'string' ? rawJob.command : '');
    const idSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    return {
        id: `cron-${index + 1}-${idSlug || 'task'}`,
        name,
        schedule: typeof rawJob?.schedule === 'string' && rawJob.schedule.trim()
            ? rawJob.schedule.trim()
            : '0 * * * *',
        action,
        payload,
        command: payload,
        channel: typeof rawJob?.channel === 'string' ? rawJob.channel : '',
        enabled: rawJob?.enabled !== false
    };
}

// Singleton to persist across hot-reloads in dev (mostly)
// Note: In Next.js dev mode, this might re-init occasionally.
// Native DB connection must be handled carefully.

export class PowerDirectorService {
    private static instance: PowerDirectorService;
    public sessionManager: SessionManager;
    public agent: Agent;
    public gateway: Gateway;
    public webRuntime: WebRuntimeServer;
    public nodeHost: NodeHostServer;
    public diagnosticsManager: DiagnosticsManager;
    public skillsManager: SkillsManager;
    public approvalsManager: ApprovalsManager;
    public bindingsManager: BindingsManager;
    public broadcastManager: BroadcastManager;
    public discoveryManager: DiscoveryManager;
    public canvasHostManager: CanvasHostManager;
    public mediaManager: MediaManager;
    public talkManager: TalkManager;
    public memoryManager: MemoryManager;
    public pluginsManager: PluginsManager;
    public usageManager: UsageManager;
    private updateDaemon: UpdateDaemon | null = null;

    private constructor() {
        const rootDir = resolvePowerDirectorRoot();
        const config = getConfigManager().getAll(false) as any;
        const env = buildRuntimeEnv(config.env || {}, process.env, rootDir);

        // Initialize logging
        configureRuntimeLogging(config.logging || {}, rootDir);
        console.log('Initializing PowerDirector Service...');
        const runtimeLogger = getRuntimeLogger();
        runGatewayUpdateCheck({
            cfg: config,
            log: runtimeLogger,
            isNixMode: false
        }).catch((error) => {
            console.warn('Startup update check failed:', error);
        });

        const modelProviders = normalizeModelProviders((config.models?.providers || {}) as Record<string, any>);
        const channelsConfig = (config.channels || {}) as Record<string, any>;
        const messagesCfg = (config.messages || {}) as Record<string, any>;
        const sessionCfg = config.session || {};
        const toolsCfg = config.tools || {};
        const authCfg = config.auth || {};
        const agentDefaults = config.agents?.defaults || {};
        const nodeHostCfg = config.nodeHost || {};
        const cronCfg = config.cron || {};

        const workspaceDir = resolveServiceWorkspaceDir(config);
        const runtimeProcessEnv = toProcessEnvMap(env);
        fs.mkdirSync(workspaceDir, { recursive: true });

        console.log('[PowerDirector] Environment loaded:', {
            rootDir,
            dotenvPath: config?.env?.dotenvPath || path.join(rootDir, '.env'),
            hasOpenAI: !!env.OPENAI_API_KEY,
            hasGemini: !!env.GEMINI_API_KEY,
            hasStability: !!env.STABILITY_API_KEY,
            geminiKeyLength: env.GEMINI_API_KEY?.length || 0
        });
        runtimeProcessEnv.WORKSPACE_DIR = workspaceDir;

        const imageModelPrimary = pickString(agentDefaults.imageModel?.primary);
        if (imageModelPrimary) {
            const parts = imageModelPrimary.split('/');
            runtimeProcessEnv.GEMINI_IMAGE_MODEL = parts[parts.length - 1];
        }

        this.mediaManager = new MediaManager(config.media || {}, rootDir);
        runtimeProcessEnv.MEDIA_DIR = this.mediaManager.getStatus().storageDir;
        runtimeProcessEnv.POWERDIRECTOR_GENERATED_DIR = resolveDefaultGeneratedDir();
        runtimeProcessEnv.POWERDIRECTOR_TMP_DIR = resolveDefaultTmpDir();
        this.talkManager = new TalkManager(config.talk || {}, { baseDir: rootDir });

        const channelAliases: Record<string, string[]> = {
            googlechat: ['googleChat', 'google-chat', 'gchat'],
            msteams: ['teams', 'msTeams', 'microsoftTeams'],
            nextcloudTalk: ['nextcloud-talk', 'nextcloudtalk'],
            bluebubbles: ['blueBubbles'],
            imessage: ['iMessage'],
            webchat: ['webChat']
        };
        const authProfiles = (authCfg.profiles || {}) as Record<string, any>;
        const authOrder = (authCfg.order || {}) as Record<string, string[]>;
        const authStore = loadAuthProfileStore(rootDir);
        const authFor = (target: string): string | undefined => resolveAuthCredential(target, authProfiles, authOrder, authStore);

        const providerConfig = (name: string): any => modelProviders[name] || {};
        const asRecord = (value: any): Record<string, any> => (
            value && typeof value === 'object' && !Array.isArray(value)
                ? value as Record<string, any>
                : {}
        );
        const findChannelConfigEntry = (name: string): { key: string; value: any } | null => {
            const candidates = [name, ...(channelAliases[name] || [])];
            for (const candidate of candidates) {
                if (Object.prototype.hasOwnProperty.call(channelsConfig, candidate)) {
                    return { key: candidate, value: channelsConfig[candidate] };
                }
            }

            const loweredCandidates = new Set(candidates.map((candidate) => candidate.toLowerCase()));
            for (const [key, value] of Object.entries(channelsConfig)) {
                if (loweredCandidates.has(key.toLowerCase())) {
                    return { key, value };
                }
            }

            return null;
        };
        const resolveChannelRuntimeConfig = (name: string): {
            key?: string;
            base: Record<string, any>;
            effective: Record<string, any>;
            accounts: Record<string, any>;
            accountId?: string;
        } => {
            const entry = findChannelConfigEntry(name);
            const base = asRecord(entry?.value);
            const accounts = asRecord(base.accounts);

            let accountId = pickString(base.defaultAccount);
            if (!accountId) {
                const ids = Object.keys(accounts).filter((id) => id.trim().length > 0);
                if (ids.length > 0) accountId = ids[0];
            }
            if (accountId && !Object.prototype.hasOwnProperty.call(accounts, accountId)) {
                const matched = Object.keys(accounts).find((id) => id.toLowerCase() === accountId!.toLowerCase());
                if (matched) accountId = matched;
            }

            const accountConfig = accountId ? asRecord(accounts[accountId]) : {};
            const effective = accountId ? { ...base, ...accountConfig, accountId } : { ...base };
            return { key: entry?.key, base, effective, accounts, accountId };
        };

        const configuredDbPath = pickString(config.database?.path, env.DB_PATH, process.env.DB_PATH);
        const dbPath = configuredDbPath || `${rootDir}/powerdirector.db`;

        const db = new DatabaseManager(dbPath);
        this.sessionManager = new SessionManager(db, {
            maxHistory: sessionCfg.maxHistory,
            ttlHours: sessionCfg.ttlHours,
            autoTitle: sessionCfg.autoTitle
        });
        this.usageManager = new UsageManager(db);



        // Setup Agent deps
        const provider: Provider = {
            config: { name: 'MockProvider', apiEndpoint: 'mock', timeoutMs: 1000 },
            circuit: new CircuitBreaker(),
            completion: async (prompt) => {
                // Simulate delay
                await new Promise(r => setTimeout(r, 500));
                return `[AI Response]: I received your message. \n\nContext used:\n${prompt.slice(0, 100)}...`;
            }
        };
        const routerMode = config.models?.mode === 'replace' ? 'replace' : 'merge';
        const router = new ProviderRouter({
            cooldowns: authCfg?.cooldowns || {},
            mode: routerMode
        });

        if (routerMode === 'replace') {
            console.log('Provider mode is REPLACE. Clearing default providers...');
            router.clearProviders();
        }

        const anthropicCfg = providerConfig('anthropic');
        const anthropicApiKey = pickString(authFor('anthropic'), anthropicCfg.apiKey, env.ANTHROPIC_API_KEY);
        const anthropicDefaultModel = pickString(anthropicCfg.defaultModel, env.ANTHROPIC_MODEL, 'claude-3-5-sonnet-latest') || 'claude-3-5-sonnet-latest';
        const anthropicSelection = resolveModelSelection(anthropicCfg, anthropicDefaultModel);
        if (anthropicApiKey) {
            console.log('Registering Anthropic Provider...');
            router.addProvider(new AnthropicProvider(anthropicApiKey, anthropicSelection.model, {
                baseURL: pickString(anthropicCfg.baseURL),
                timeoutMs: asPositiveNumber(anthropicSelection.entry?.timeoutOverride),
                maxTokens: asPositiveNumber(anthropicSelection.entry?.maxTokens),
                rateLimitPerMinute: asPositiveNumber(anthropicSelection.entry?.rateLimit)
            }));
        }

        const openaiCfg = providerConfig('openai');
        const openaiApiKey = pickString(authFor('openai'), openaiCfg.apiKey, env.OPENAI_API_KEY);
        const openaiDefaultModel = pickString(openaiCfg.defaultModel, env.OPENAI_MODEL) || '';
        const openaiSelection = resolveModelSelection(openaiCfg, openaiDefaultModel);
        if (openaiApiKey) {
            console.log('Registering OpenAI Provider...');
            router.addProvider(new OpenAIProvider(openaiApiKey, openaiSelection.model, {
                baseURL: pickString(openaiCfg.baseURL),
                timeoutMs: asPositiveNumber(openaiSelection.entry?.timeoutOverride),
                maxTokens: asPositiveNumber(openaiSelection.entry?.maxTokens),
                rateLimitPerMinute: asPositiveNumber(openaiSelection.entry?.rateLimit)
            }));
        }

        const geminiCfg = providerConfig('gemini');
        const geminiApiKey = pickString(
            authFor('gemini'),
            authFor('google-gemini-cli'),
            geminiCfg.apiKey,
            env.GEMINI_API_KEY
        );
        const geminiDefaultModel = pickString(geminiCfg.defaultModel, env.GEMINI_MODEL) || '';
        const geminiSelection = resolveModelSelection(geminiCfg, geminiDefaultModel);
        if (geminiApiKey) {
            console.log('Registering Gemini Provider...');
            const model = geminiSelection.model || 'gemini-3-pro-preview';
            router.addProvider(new GeminiProvider(geminiApiKey, model, {
                timeoutMs: asPositiveNumber(geminiSelection.entry?.timeoutOverride),
                maxTokens: asPositiveNumber(geminiSelection.entry?.maxTokens),
                rateLimitPerMinute: asPositiveNumber(geminiSelection.entry?.rateLimit)
            }));
        }

        const registerOpenAICompatibleProvider = (opts: {
            id: string;
            envKey?: string;
            baseUrlEnvKey?: string;
            modelEnvKey?: string;
            defaultBaseURL: string;
            defaultModel: string;
            allowNoApiKey?: boolean;
            fallbackApiKey?: string;
            fallbackRateLimit?: number;
            fallbackTimeoutMs?: number;
            disableTools?: boolean;
        }) => {
            const cfg = providerConfig(opts.id);
            const apiKey = pickString(
                authFor(opts.id),
                cfg.apiKey,
                opts.envKey ? env[opts.envKey] : undefined,
                opts.fallbackApiKey
            );
            const baseURL = pickString(cfg.baseURL, opts.baseUrlEnvKey ? env[opts.baseUrlEnvKey] : undefined, opts.defaultBaseURL);
            const rawDefaultModel = pickString(cfg.defaultModel, opts.modelEnvKey ? env[opts.modelEnvKey] : undefined, opts.defaultModel) || opts.defaultModel;
            const selection = resolveModelSelection(cfg, rawDefaultModel);

            if (!baseURL) return;
            if (!opts.allowNoApiKey && !apiKey) return;

            router.addProvider(new OpenAICompatibleProvider({
                name: opts.id,
                apiKey: apiKey || 'none',
                baseURL,
                defaultModel: selection.model,
                timeoutMs: asPositiveNumber(selection.entry?.timeoutOverride) || opts.fallbackTimeoutMs,
                maxTokens: asPositiveNumber(selection.entry?.maxTokens),
                rateLimitPerMinute: asPositiveNumber(selection.entry?.rateLimit) || opts.fallbackRateLimit,
                disableTools: opts.disableTools
            }));
        };

        registerOpenAICompatibleProvider({
            id: 'zai',
            envKey: 'ZAI_API_KEY',
            baseUrlEnvKey: 'ZAI_BASE_URL',
            modelEnvKey: 'ZAI_MODEL',
            defaultBaseURL: 'https://api.z.ai/api/paas/v4',
            defaultModel: pickString(env.ZAI_MODEL) || '',
            // Default to very conservative limit for trial keys if not configured
            fallbackRateLimit: 1
        });

        registerOpenAICompatibleProvider({
            id: 'grok',
            envKey: 'XAI_API_KEY',
            baseUrlEnvKey: 'XAI_BASE_URL',
            modelEnvKey: 'XAI_MODEL',
            defaultBaseURL: 'https://api.x.ai/v1',
            defaultModel: pickString(env.XAI_MODEL) || ''
        });

        registerOpenAICompatibleProvider({
            id: 'deepseek',
            envKey: 'DEEPSEEK_API_KEY',
            baseUrlEnvKey: 'DEEPSEEK_BASE_URL',
            modelEnvKey: 'DEEPSEEK_MODEL',
            defaultBaseURL: 'https://api.deepseek.com',
            defaultModel: pickString(env.DEEPSEEK_MODEL) || ''
        });

        registerOpenAICompatibleProvider({
            id: 'openrouter',
            envKey: 'OPENROUTER_API_KEY',
            baseUrlEnvKey: 'OPENROUTER_BASE_URL',
            modelEnvKey: 'OPENROUTER_MODEL',
            defaultBaseURL: 'https://openrouter.ai/api/v1',
            defaultModel: pickString(env.OPENROUTER_MODEL) || ''
        });

        registerOpenAICompatibleProvider({
            id: 'mistral',
            envKey: 'MISTRAL_API_KEY',
            baseUrlEnvKey: 'MISTRAL_BASE_URL',
            modelEnvKey: 'MISTRAL_MODEL',
            defaultBaseURL: 'https://api.mistral.ai/v1',
            defaultModel: pickString(env.MISTRAL_MODEL) || ''
        });

        registerOpenAICompatibleProvider({
            id: 'perplexity',
            envKey: 'PERPLEXITY_API_KEY',
            baseUrlEnvKey: 'PERPLEXITY_BASE_URL',
            modelEnvKey: 'PERPLEXITY_MODEL',
            defaultBaseURL: 'https://api.perplexity.ai',
            defaultModel: pickString(env.PERPLEXITY_MODEL) || ''
        });

        registerOpenAICompatibleProvider({
            id: 'glm',
            envKey: 'GLM_API_KEY',
            baseUrlEnvKey: 'GLM_BASE_URL',
            modelEnvKey: 'GLM_MODEL',
            defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
            defaultModel: pickString(env.GLM_MODEL) || ''
        });

        registerOpenAICompatibleProvider({
            id: 'huggingface',
            envKey: 'HF_API_KEY',
            baseUrlEnvKey: 'HF_BASE_URL',
            modelEnvKey: 'HF_MODEL',
            defaultBaseURL: 'https://api-inference.huggingface.co/models',
            defaultModel: pickString(env.HF_MODEL) || ''
        });

        registerOpenAICompatibleProvider({
            id: 'inception',
            envKey: 'INCEPTION_API_KEY',
            baseUrlEnvKey: 'INCEPTION_BASE_URL',
            modelEnvKey: 'INCEPTION_MODEL',
            defaultBaseURL: 'https://api.inceptionlabs.ai/v1',
            defaultModel: pickString(env.INCEPTION_MODEL) || 'mercury-2',
            disableTools: true
        });

        registerOpenAICompatibleProvider({
            id: 'ollama',
            baseUrlEnvKey: 'OLLAMA_BASE_URL',
            modelEnvKey: 'OLLAMA_MODEL',
            defaultBaseURL: 'http://127.0.0.1:11434/v1',
            defaultModel: pickString(env.OLLAMA_MODEL) || '',
            allowNoApiKey: true,
            fallbackApiKey: 'ollama'
        });

        registerOpenAICompatibleProvider({
            id: 'ollama-desktop',
            baseUrlEnvKey: 'OLLAMA_DESKTOP_BASE_URL',
            modelEnvKey: 'OLLAMA_DESKTOP_MODEL',
            defaultBaseURL: 'http://127.0.0.1:11434/v1',
            defaultModel: pickString(env.OLLAMA_DESKTOP_MODEL) || '',
            allowNoApiKey: true,
            fallbackApiKey: 'ollama',
            // Set timeout to 2 minutes for remote LAN/GPU wake latency
            fallbackTimeoutMs: 120000
        });

        const minimaxCfg = authFor('minimax');
        const minimaxToken = pickString(minimaxCfg, env.MINIMAX_API_KEY);
        if (minimaxToken) {
            console.log('Registering Minimax Provider...');
            router.addProvider(new MinimaxProvider(minimaxToken, 'MiniMax-M2.1'));
        }

        const logger = getRuntimeLogger();
        logger.info('--- AGENT INSTANCE INITIALIZING PROVIDERS ---');

        // CLI providers
        const geminiCliBackend = resolveCliBackendConfig(agentDefaults, ['google-gemini-cli', 'gemini-cli']);
        const codexCliBackend = resolveCliBackendConfig(agentDefaults, ['openai-codex', 'codex-cli']);

        const geminiCliCfg = modelProviders['google-gemini-cli'] || {};
        const geminiCliEnabled = geminiCliCfg.enabled ?? (env.GEMINI_CLI_ENABLED !== 'false');
        const geminiCliModels = Array.isArray(geminiCliCfg.models) ? geminiCliCfg.models : [];
        const geminiCliModel = pickString(geminiCliCfg.defaultModel, env.GEMINI_CLI_MODEL, geminiCliModels[0]?.id) || '';
        if (geminiCliEnabled) {
            console.log('Registering Gemini CLI Provider...');
            const geminiProvider = new GeminiCLIProvider(
                geminiCliModel!,
                {
                    ...process.env,
                    ...runtimeProcessEnv
                },
                toGeminiCliBackendConfig(geminiCliBackend)
            );
            router.addProvider(geminiProvider);
        }

        const codexCliCfg = modelProviders['openai-codex'] || {};
        const codexCliEnabled = codexCliCfg.enabled ?? (env.CODEX_CLI_ENABLED !== 'false');
        const codexCliModels = Array.isArray(codexCliCfg.models) ? codexCliCfg.models : [];
        const codexCliModel = pickString(codexCliCfg.defaultModel, env.CODEX_CLI_MODEL, codexCliModels[0]?.id) || '';
        const codexApprovalMode = pickString(codexCliCfg.approvalMode, env.CODEX_CLI_APPROVAL_MODE, 'unrestricted') || 'unrestricted';
        const codexReasoningConfig = resolveCodexReasoningConfig(config);
        if (codexCliEnabled) {
            console.log('Registering Codex CLI Provider...');
            const codexProvider = new CodexCLIProvider(
                codexCliModel!,
                codexApprovalMode,
                {
                    ...process.env,
                    ...runtimeProcessEnv
                },
                {
                    ...(toCodexCliBackendConfig(codexCliBackend) || {}),
                    defaultReasoningEffort: codexReasoningConfig.defaultReasoningEffort,
                    modelReasoningEfforts: codexReasoningConfig.modelReasoningEfforts,
                }
            );
            router.addProvider(codexProvider);
        }
        const talkCfg = config.talk || {};
        const talkApiKey = pickString(
            talkCfg.apiKey,
            authFor('talk'),
            env.TALK_API_KEY,
            env.ELEVENLABS_API_KEY,
            env.XI_API_KEY,
            openaiApiKey
        ) || '';
        this.talkManager = new TalkManager({
            ...talkCfg,
            apiKey: talkApiKey
        }, { baseDir: rootDir });

        // router.addProvider(provider); // Final fallback to mock

        const preferredProviders = resolvePreferredProviderOrder(agentDefaults, modelProviders);
        router.reorderProviders(preferredProviders);

        const compactionMode = agentDefaults?.compaction?.mode === 'default' ? 'default' : 'safeguard';
        const baseCompactionThreshold = 100;
        let compactionThreshold = baseCompactionThreshold;
        const configuredContextTokens = Math.max(1000, Math.floor(agentDefaults?.contextTokens ?? 256000));
        let contextBudget = {
            maxTokens: configuredContextTokens,
            maxImagesPerTurn: 5,
            maxTotalImages: 10,
            retainSystemPrompt: true
        };

        if (compactionMode === 'safeguard') {
            const reserveFloor = Math.max(0, Math.floor(agentDefaults?.compaction?.reserveTokensFloor ?? 0));
            const shareRaw = typeof agentDefaults?.compaction?.maxHistoryShare === 'number'
                ? agentDefaults.compaction.maxHistoryShare
                : 0.85;
            const maxHistoryShare = Math.min(0.9, Math.max(0.1, Number(shareRaw)));
            const availableTokens = Math.max(500, configuredContextTokens - reserveFloor);
            const historyBudgetTokens = Math.max(500, Math.floor(availableTokens * maxHistoryShare));
            contextBudget = {
                maxTokens: Math.min(configuredContextTokens, historyBudgetTokens),
                maxImagesPerTurn: 4,
                maxTotalImages: 8,
                retainSystemPrompt: true
            };

            const thresholdFromTokens = Math.max(20, Math.floor(contextBudget.maxTokens / 120));
            compactionThreshold = Math.max(20, Math.min(baseCompactionThreshold, thresholdFromTokens));
        }

        if (agentDefaults?.compaction?.memoryFlush?.enabled === true) {
            compactionThreshold = Math.max(10, Math.floor(compactionThreshold * 0.8));
        }

        const budget = new BudgetManager(contextBudget);
        const contextPruning = (agentDefaults?.contextPruning && typeof agentDefaults.contextPruning === 'object')
            ? agentDefaults.contextPruning
            : undefined;
        const pruner = new ContextPruner(
            budget,
            contextBudget,
            {
                ...(contextPruning as ContextPruningConfig || {}),
                contextWindowTokens: configuredContextTokens
            }
        );

        this.skillsManager = new SkillsManager(config.skills || {}, {
            baseDir: rootDir,
            env: runtimeProcessEnv
        });

        // Use lazy require to break circular dependency
        const { initializeTools } = require('./registry/tools');
        const tools = new ToolRegistry();
        initializeTools(tools, {
            env,
            config,
            workspaceDir,
            rootDir,
            runtimeProcessEnv,
            authFor,
            pickString,
            sessionManager: this.sessionManager,
            mediaManager: this.mediaManager,
            getGateway: () => this.gateway,
            agentDefaults
        });

        const maxConcurrent = Math.max(1, agentDefaults.maxConcurrent ?? 4);
        const imageModelHint = pickString(agentDefaults?.imageModel?.primary);
        this.memoryManager = new MemoryManager(config, { baseDir: rootDir });

        this.agent = new Agent(this.sessionManager, this.usageManager, router, pruner, tools, this.memoryManager, {
            runTimeoutMs: (agentDefaults.timeoutSeconds ?? 180) * 1000,
            compactionThreshold,
            maxTurns: asPositiveNumber(agentDefaults.maxTurns),
            suppressToolErrors: messagesCfg.suppressToolErrors === true
        });

        const nodeManager = new NodeManager({
            enabled: nodeHostCfg.enabled ?? true,
            maxNodes: nodeHostCfg.maxNodes ?? 10,
            heartbeatInterval: nodeHostCfg.heartbeatInterval ?? 30,
            capabilities: Array.isArray(nodeHostCfg.capabilities) ? nodeHostCfg.capabilities : []
        });

        const cronManager = new CronManager({
            enabled: cronCfg.enabled ?? false,
            maxConcurrentRuns: cronCfg.maxConcurrentRuns
        });
        const configuredJobs = Array.isArray(cronCfg.jobs) ? cronCfg.jobs : [];
        const cronTasks = configuredJobs.map((job: any, index: number) => toCronTask(job, index));
        if (cronTasks.length > 0) {
            cronManager.replaceTasks(cronTasks);
            console.log(`[Cron] Registered ${cronTasks.length} jobs from config.`);
        }
        const hooksManager = new HooksManager(config.hooks || {}, {
            cwd: workspaceDir || rootDir,
            env: runtimeProcessEnv
        });
        this.approvalsManager = new ApprovalsManager(config.approvals || {});
        this.bindingsManager = new BindingsManager(Array.isArray(config.bindings) ? config.bindings : []);
        this.broadcastManager = new BroadcastManager(config.broadcast || {});
        this.discoveryManager = new DiscoveryManager(config.discovery || {});
        this.canvasHostManager = new CanvasHostManager(config.canvasHost || {});
        this.pluginsManager = new PluginsManager(config.plugins || {}, {
            baseDir: rootDir,
            env: runtimeProcessEnv
        });
        this.pluginsManager.initialize();
        this.diagnosticsManager = new DiagnosticsManager(config.diagnostics || {}, rootDir);
        this.diagnosticsManager.start();
        const resolveTerminalOptions = (): TerminalRuntimeOptions => {
            const terminalCfg = (config.terminal as any) || {};
            const shellRaw = pickString(terminalCfg.shell);
            const shell = shellRaw === 'bash' || shellRaw === 'zsh'
                ? shellRaw as TerminalRuntimeOptions['shell']
                : undefined;
            const autoTimeoutMinutes = typeof terminalCfg.autoTimeoutMinutes === 'number' && Number.isFinite(terminalCfg.autoTimeoutMinutes)
                ? terminalCfg.autoTimeoutMinutes
                : undefined;
            const terminalPort = typeof terminalCfg.port === 'number' && Number.isFinite(terminalCfg.port)
                ? terminalCfg.port
                : undefined;
            const bind = terminalCfg.bind;

            return {
                shell,
                autoTimeoutMinutes,
                port: terminalPort,
                bind
            };
        };

        this.gateway = new Gateway(this.sessionManager, this.agent, {
            messagePolicy: {
                messagePrefix: pickString(messagesCfg.messagePrefix) || '',
                responsePrefix: pickString(messagesCfg.responsePrefix) || '',
                groupChat: {
                    mentionPatterns: Array.isArray(messagesCfg.groupChat?.mentionPatterns)
                        ? messagesCfg.groupChat.mentionPatterns.filter((entry: any) => typeof entry === 'string')
                        : [],
                    historyLimit: typeof messagesCfg.groupChat?.historyLimit === 'number' && Number.isFinite(messagesCfg.groupChat.historyLimit)
                        ? messagesCfg.groupChat.historyLimit
                        : undefined
                },
                queue: {
                    mode: (
                        messagesCfg.queue?.mode === 'steer'
                        || messagesCfg.queue?.mode === 'followup'
                        || messagesCfg.queue?.mode === 'collect'
                        || messagesCfg.queue?.mode === 'steer-backlog'
                        || messagesCfg.queue?.mode === 'steer+backlog'
                        || messagesCfg.queue?.mode === 'queue'
                        || messagesCfg.queue?.mode === 'interrupt'
                    )
                        ? messagesCfg.queue.mode
                        : undefined,
                    byChannel: (messagesCfg.queue?.byChannel && typeof messagesCfg.queue.byChannel === 'object' && !Array.isArray(messagesCfg.queue.byChannel))
                        ? messagesCfg.queue.byChannel
                        : undefined,
                    debounceMs: typeof messagesCfg.queue?.debounceMs === 'number' && Number.isFinite(messagesCfg.queue.debounceMs)
                        ? messagesCfg.queue.debounceMs
                        : undefined,
                    debounceMsByChannel: (messagesCfg.queue?.debounceMsByChannel && typeof messagesCfg.queue.debounceMsByChannel === 'object' && !Array.isArray(messagesCfg.queue.debounceMsByChannel))
                        ? messagesCfg.queue.debounceMsByChannel
                        : undefined,
                    cap: typeof messagesCfg.queue?.cap === 'number' && Number.isFinite(messagesCfg.queue.cap)
                        ? messagesCfg.queue.cap
                        : undefined,
                    drop: (
                        messagesCfg.queue?.drop === 'old'
                        || messagesCfg.queue?.drop === 'new'
                        || messagesCfg.queue?.drop === 'summarize'
                    )
                        ? messagesCfg.queue.drop
                        : undefined
                },
                inbound: {
                    debounceMs: typeof messagesCfg.inbound?.debounceMs === 'number' && Number.isFinite(messagesCfg.inbound.debounceMs)
                        ? messagesCfg.inbound.debounceMs
                        : undefined,
                    byChannel: (messagesCfg.inbound?.byChannel && typeof messagesCfg.inbound.byChannel === 'object' && !Array.isArray(messagesCfg.inbound.byChannel))
                        ? messagesCfg.inbound.byChannel
                        : undefined
                },
                ackReaction: pickString(messagesCfg.ackReaction) || '✅',
                ackReactionScope: messagesCfg.ackReactionScope ?? 'group-mentions',
                removeAckAfterReply: messagesCfg.removeAckAfterReply === true,
                suppressToolErrors: messagesCfg.suppressToolErrors === true
            },
            commandPolicy: {
                native: config.commands?.native ?? 'auto',
                nativeSkills: config.commands?.nativeSkills ?? 'auto',
                bash: config.commands?.bash ?? true,
                restart: config.commands?.restart ?? true,
                allowFrom: Array.isArray(config.commands?.allowFrom) ? config.commands.allowFrom : [],
                ownerAllowFrom: Array.isArray(config.commands?.ownerAllowFrom) ? config.commands.ownerAllowFrom : [],
                useAccessGroups: config.commands?.useAccessGroups ?? false
            },
            uiPolicy: config.ui,
            http: config.gateway?.http,
            sessionConfig: {
                scope: sessionCfg.scope,
                dmScope: sessionCfg.dmScope,
                identityLinks: sessionCfg.identityLinks,
                mainKey: sessionCfg.mainKey,
                sendPolicy: sessionCfg.sendPolicy
            },
            channelPolicies: channelsConfig,
            networkPolicy: {
                port: config.gateway?.port ?? 3008,
                mode: config.gateway?.mode ?? 'local',
                bind: config.gateway?.bind ?? 'lan',
                disableDeviceAuth: config.gateway?.controlUi?.dangerouslyDisableDeviceAuth ?? false,
                authMode: config.gateway?.auth?.mode ?? 'token',
                authToken: pickString(config.gateway?.auth?.token, authFor('gateway'), env.GATEWAY_TOKEN) || '',
                trustedProxies: Array.isArray(config.gateway?.trustedProxies) ? config.gateway.trustedProxies : [],
                tailscaleMode: config.gateway?.tailscale?.mode ?? 'off',
                tailscaleResetOnExit: config.gateway?.tailscale?.resetOnExit ?? false,
                rateLimit: {
                    maxAttempts: config.gateway?.auth?.rateLimit?.maxAttempts,
                    windowMs: config.gateway?.auth?.rateLimit?.windowMs,
                    lockoutMs: config.gateway?.auth?.rateLimit?.lockoutMs,
                    exemptLoopback: config.gateway?.auth?.rateLimit?.exemptLoopback
                }
            },
            commandCwd: workspaceDir,
            commandEnv: runtimeProcessEnv,
            responseMaxBodyBytes: config.gateway?.http?.endpoints?.responses?.maxBodyBytes ?? 50 * 1024 * 1024,
            maxConcurrent,
            imageModelHint: imageModelHint || undefined,
            defaultFallbackChain: (() => {
                const primary = pickString(agentDefaults?.model?.primary);
                const primaryProvider = primary && primary.includes('/')
                    ? primary.slice(0, primary.indexOf('/')).trim()
                    : undefined;
                const configuredProviderIds = new Set(
                    Object.keys(normalizeModelProviders((config?.models?.providers as Record<string, any>) || {}))
                        .map((providerId) => providerId.toLowerCase())
                );
                const fallbacks = Array.isArray(agentDefaults?.model?.fallbacks)
                    ? (agentDefaults.model.fallbacks as any[])
                        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                        .map((entry) => normalizeDefaultFallbackEntry(entry, {
                            primaryProvider,
                            configuredProviderIds,
                        }))
                    : [];
                return [primary, ...fallbacks].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
            })(),
            terminal: resolveTerminalOptions,
            toolPolicyConfig: {
                tools: config.tools,
                agents: config.agents
            },
            linkUnderstandingConfig: toolsCfg.links,
            blockStreamingConfig: {
                defaultEnabled: agentDefaults?.blockStreamingDefault === 'on',
                breakMode: agentDefaults?.blockStreamingBreak === 'message_end' ? 'message_end' : 'text_end',
                chunk: {
                    breakPreference: agentDefaults?.blockStreamingChunk?.breakPreference === 'newline' || agentDefaults?.blockStreamingChunk?.breakPreference === 'sentence'
                        ? agentDefaults.blockStreamingChunk.breakPreference
                        : 'paragraph',
                    minChars: typeof agentDefaults?.blockStreamingChunk?.minChars === 'number' && Number.isFinite(agentDefaults.blockStreamingChunk.minChars)
                        ? Math.max(1, Math.floor(agentDefaults.blockStreamingChunk.minChars))
                        : 800,
                    maxChars: typeof agentDefaults?.blockStreamingChunk?.maxChars === 'number' && Number.isFinite(agentDefaults.blockStreamingChunk.maxChars)
                        ? Math.max(1, Math.floor(agentDefaults.blockStreamingChunk.maxChars))
                        : 1200
                },
                coalesce: {
                    idleMs: typeof agentDefaults?.blockStreamingCoalesce?.idleMs === 'number' && Number.isFinite(agentDefaults.blockStreamingCoalesce.idleMs)
                        ? Math.max(0, Math.floor(agentDefaults.blockStreamingCoalesce.idleMs))
                        : 1000,
                    minChars: typeof agentDefaults?.blockStreamingCoalesce?.minChars === 'number' && Number.isFinite(agentDefaults.blockStreamingCoalesce.minChars)
                        ? Math.max(1, Math.floor(agentDefaults.blockStreamingCoalesce.minChars))
                        : 1,
                    maxChars: typeof agentDefaults?.blockStreamingCoalesce?.maxChars === 'number' && Number.isFinite(agentDefaults.blockStreamingCoalesce.maxChars)
                        ? Math.max(1, Math.floor(agentDefaults.blockStreamingCoalesce.maxChars))
                        : 2000
                }
            },
            nodeManager,
            cronManager,
            hooksManager,
            skillsManager: this.skillsManager,
            approvalsManager: this.approvalsManager,
            bindingsManager: this.bindingsManager,
            broadcastManager: this.broadcastManager,
            discoveryManager: this.discoveryManager,
            canvasHostManager: this.canvasHostManager,
            mediaManager: this.mediaManager,
            talkManager: this.talkManager,
            memoryManager: this.memoryManager,
            pluginsManager: this.pluginsManager
        });

        const commandPrefix = '/';
        cronManager.setExecutor(async (task) => {
            const sessionName = `cron_${task.id}`;
            let session = this.sessionManager.listSessions().find((s) => s.name === sessionName);
            if (!session) {
                session = this.sessionManager.createSession(sessionName);
            }

            const channelLabel = typeof task.channel === 'string' ? task.channel.trim() : '';
            const channelId = channelLabel ? `cron:${channelLabel}` : 'cron';

            if (task.action === 'webhook') {
                const targetUrl = (task.payload || '').trim();
                if (!targetUrl) {
                    throw new Error(`Cron webhook task "${task.name}" is missing a payload URL.`);
                }
                const parsedUrl = new URL(targetUrl);
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                    throw new Error(`Cron webhook task "${task.name}" must use http/https URL.`);
                }

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                try {
                    const response = await fetch(parsedUrl.toString(), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            source: 'powerdirector-cron',
                            task: {
                                id: task.id,
                                name: task.name,
                                channel: task.channel || '',
                                action: task.action
                            },
                            timestamp: new Date().toISOString()
                        }),
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        throw new Error(`Webhook responded with HTTP ${response.status}.`);
                    }
                } finally {
                    clearTimeout(timeout);
                }
                return;
            }

            let input = (task.payload || '').trim();
            if (task.action === 'command') {
                if (!input) {
                    input = `${commandPrefix}status`;
                } else if (!input.startsWith(commandPrefix)) {
                    input = `${commandPrefix}${input}`;
                }
            } else if (!input) {
                input = `Cron task "${task.name}" executed.`;
            }

            await this.gateway.processInput(session.id, input, {
                senderId: 'cron',
                channelId
            });
        });

        this.webRuntime = new WebRuntimeServer({
            enabled: config.web?.enabled ?? true
        });

        this.nodeHost = new NodeHostServer(nodeManager, {
            enabled: nodeHostCfg.enabled ?? false,
            port: nodeHostCfg.port ?? 18790,
            authToken: pickString(nodeHostCfg.authToken, authFor('nodehost'), env.NODE_HOST_TOKEN) || ''
        });

        // Initialize Channels via registry
        const { initializeChannels } = require('./registry/channels');
        initializeChannels(this.gateway, {
            env,
            config,
            authFor,
            pickString,
            resolveChannelRuntimeConfig,
            isChannelEnabled,
            envBool,
            envPositiveNumber
        });

        // Start Gateway after all channels are registered.
        this.gateway.start().catch(err => console.error('Gateway start failed:', err));
        this.webRuntime.start().catch(err => console.error('Web runtime start failed:', err));
        this.nodeHost.start().catch(err => console.error('Node host start failed:', err));

        this.updateDaemon = new UpdateDaemon(config, false, {
            getActiveRunsCount: () => this.gateway.getActiveAgentsCount(),
            onUpdated: async () => {
                const restart = scheduleAppProcessRestart();
                if (!restart.ok) {
                    runtimeLogger.warn(
                        `auto-update installed successfully but restart failed (${restart.mode}${restart.detail ? `: ${restart.detail}` : ''})`
                    );
                }
            }
        });
        this.updateDaemon.start();
    }

    public static getInstance(): PowerDirectorService {
        const g = global as any;
        if (!g.pdServiceInstance) {
            g.pdServiceInstance = new PowerDirectorService();
        }
        return g.pdServiceInstance;
    }

    public static async resetInstance(): Promise<void> {
        const g = global as any;
        const instance = g.pdServiceInstance;
        if (instance) {
            try {
                await instance.gateway.stop();
            } catch (err) {
                console.warn('Failed to stop existing gateway during reset:', err);
            }
            try {
                await instance.webRuntime.stop();
            } catch (err) {
                console.warn('Failed to stop existing web runtime during reset:', err);
            }
            try {
                await instance.nodeHost.stop();
            } catch (err) {
                console.warn('Failed to stop existing node host during reset:', err);
            }
            try {
                instance.diagnosticsManager.stop();
            } catch (err) {
                console.warn('Failed to stop diagnostics manager during reset:', err);
            }
            try {
                instance.discoveryManager.stop();
            } catch (err) {
                console.warn('Failed to stop discovery manager during reset:', err);
            }
            try {
                await instance.memoryManager.stop();
            } catch (err) {
                console.warn('Failed to stop memory manager during reset:', err);
            }
            try {
                instance.updateDaemon?.stop();
            } catch (err) {
                console.warn('Failed to stop update daemon during reset:', err);
            }
            g.pdServiceInstance = undefined;
        }
    }
}

export function getService(): PowerDirectorService {
    return PowerDirectorService.getInstance();
}

export async function resetService(): Promise<void> {
    await PowerDirectorService.resetInstance();
}
