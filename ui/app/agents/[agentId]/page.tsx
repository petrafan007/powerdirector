'use client';

import React, { useEffect, useMemo, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Modal } from '@/app/components/Modal';

type AgentsPanel = 'overview' | 'files' | 'tools' | 'skills' | 'channels' | 'cron';

type ModelValue = string | { primary?: string; fallbacks?: string[] };

interface FileMeta {
    name: string;
    path: string;
    missing: boolean;
    size?: number;
    updatedAt?: number;
}

interface Identity {
    name: string;
    emoji: string;
    missing: boolean;
}

interface SkillInfo {
    id: string;
    name: string;
    description: string;
    version?: string;
    author?: string;
    missing: boolean;
    bundled: boolean;
    status: 'eligible' | 'blocked' | 'installed' | 'unknown';
    source?: string;
    install?: any[];
    missingBins?: string[];
    hasRunner?: boolean;
    dir?: string;
    apiKey?: string;
    requiresApiKey?: boolean;
}

interface BindingEntry {
    channelId: string;
    agentId?: string;
    model?: string;
    systemPrompt?: string;
    tools?: string[];
}

interface ChannelStatus {
    id: string;
    name: string;
    enabled: boolean;
    configured?: boolean;
    status: string;
    config: any;
    health?: any;
    probe?: any;
}

interface CronJobEntry {
    id: string;
    name: string;
    schedule: string;
    action?: string;
    payload?: string;
    channel?: string;
    enabled: boolean;
    agentId?: string;
    description?: string;
    sessionTarget?: string;
}

interface CronStatus {
    enabled: boolean;
    jobs: number;
    nextWakeAtMs: number | null;
}

interface AgentEntry {
    id: string;
    default?: boolean;
    name?: string;
    workspace?: string;
    agentDir?: string;
    model?: ModelValue;
    skills?: string[];
    tools?: {
        profile?: string;
        allow?: string[];
        alsoAllow?: string[];
        deny?: string[];
        exec?: {
            host?: 'sandbox' | 'gateway' | 'node';
            ask?: 'off' | 'on-miss' | 'always';
        };
    };
    [key: string]: any;
}

interface AgentConfig {
    tools?: {
        profile?: string;
        allow?: string[];
        alsoAllow?: string[];
        deny?: string[];
        web?: any;
        [key: string]: unknown;
    };
    skills?: {
        entries: Record<string, { enabled: boolean; apiKey?: string }>;
        [key: string]: unknown;
    };
    agents?: {
        defaults?: {
            model?: ModelValue;
            models?: Record<string, { alias?: string }>;
            workspace?: string;
            [key: string]: unknown;
        };
        list?: AgentEntry[];
    };
    channels?: Record<string, any>;
    cron?: {
        enabled?: boolean;
        jobs?: CronJobEntry[];
    };
    bindings?: BindingEntry[];
    [key: string]: unknown;
}

const TOOL_GROUPS: Record<string, string[]> = {
    'group:memory': ['memory_search', 'memory_get'],
    'group:web': ['web_search', 'web_fetch'],
    'group:fs': ['read', 'write', 'edit', 'apply_patch'],
    'group:runtime': ['exec', 'process'],
    'group:sessions': ['sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn', 'subagents', 'session_status'],
    'group:ui': ['browser', 'canvas'],
    'group:automation': ['cron', 'gateway'],
    'group:messaging': ['message'],
    'group:nodes': ['nodes'],
    'group:iot': ['homeassistant', 'spotify', 'sonos', 'bambu', 'robo_rock', 'frigate'],
    'group:productivity': ['github', 'notion', 'trello', 'obsidian', 'bear_notes', 'things3', 'gmail_triggers', 'onepassword'],
    'group:social': ['twitter', 'reddit', 'linkedin'],
    'group:utilities': ['weather', 'gif', 'shazam', 'voice', 'skill', 'echo']
};

const TOOL_NAME_ALIASES: Record<string, string> = {
    bash: 'exec',
    'apply-patch': 'apply_patch'
};

const TOOL_PROFILES: Record<string, { allow?: string[]; deny?: string[] }> = {
    minimal: { allow: ['session_status'] },
    coding: { allow: ['group:fs', 'group:runtime', 'group:sessions', 'group:memory', 'image'] },
    messaging: { allow: ['group:messaging', 'sessions_list', 'sessions_history', 'sessions_send', 'session_status'] },
    full: {}
};

const TOOL_SECTIONS = [
    {
        id: 'fs',
        label: 'Files',
        tools: [
            { id: 'read', label: 'read', description: 'Read file contents' },
            { id: 'write', label: 'write', description: 'Create or overwrite files' },
            { id: 'edit', label: 'edit', description: 'Make precise edits' },
            { id: 'apply_patch', label: 'apply_patch', description: 'Patch files (OpenAI)' }
        ]
    },
    {
        id: 'runtime',
        label: 'Runtime',
        tools: [
            { id: 'exec', label: 'exec', description: 'Run shell commands' },
            { id: 'process', label: 'process', description: 'Manage background processes' }
        ]
    },
    {
        id: 'web',
        label: 'Web',
        tools: [
            { id: 'web_search', label: 'web_search', description: 'Search the web' },
            { id: 'web_fetch', label: 'web_fetch', description: 'Fetch web content' }
        ]
    },
    {
        id: 'memory',
        label: 'Memory',
        tools: [
            { id: 'memory_search', label: 'memory_search', description: 'Semantic search' },
            { id: 'memory_get', label: 'memory_get', description: 'Read memory files' }
        ]
    },
    {
        id: 'sessions',
        label: 'Sessions',
        tools: [
            { id: 'sessions_list', label: 'sessions_list', description: 'List sessions' },
            { id: 'sessions_history', label: 'sessions_history', description: 'Session history' },
            { id: 'sessions_send', label: 'sessions_send', description: 'Send to session' },
            { id: 'sessions_spawn', label: 'sessions_spawn', description: 'Spawn sub-agent' },
            { id: 'session_status', label: 'session_status', description: 'Session status' }
        ]
    },
    {
        id: 'ui',
        label: 'UI',
        tools: [
            { id: 'browser', label: 'browser', description: 'Control web browser' },
            { id: 'canvas', label: 'canvas', description: 'Control canvases' }
        ]
    },
    {
        id: 'messaging',
        label: 'Messaging',
        tools: [{ id: 'message', label: 'message', description: 'Send messages' }]
    },
    {
        id: 'automation',
        label: 'Automation',
        tools: [
            { id: 'cron', label: 'cron', description: 'Schedule tasks' },
            { id: 'gateway', label: 'gateway', description: 'Gateway control' }
        ]
    },
    {
        id: 'nodes',
        label: 'Nodes',
        tools: [{ id: 'nodes', label: 'nodes', description: 'Nodes + devices' }]
    },
    {
        id: 'agents',
        label: 'Agents',
        tools: [{ id: 'agents_list', label: 'agents_list', description: 'List agents' }]
    },
    {
        id: 'media',
        label: 'Media',
        tools: [
            { id: 'image', label: 'image', description: 'Image understanding' },
            { id: 'image_gen', label: 'image-gen', description: 'Generate images' },
            { id: 'gif', label: 'gif', description: 'Search & send GIFs' }
        ]
    },
    {
        id: 'iot',
        label: 'IoT & Home',
        tools: [
            { id: 'homeassistant', label: 'homeassistant', description: 'Home Assistant' },
            { id: 'spotify', label: 'spotify', description: 'Spotify Player' },
            { id: 'sonos', label: 'sonos', description: 'Sonos Control' },
            { id: 'bambu', label: 'bambu', description: '3D Printer' },
            { id: 'frigate', label: 'frigate', description: 'Frigate NVR' }
        ]
    },
    {
        id: 'productivity',
        label: 'Productivity',
        tools: [
            { id: 'github', label: 'github', description: 'GitHub API' },
            { id: 'notion', label: 'notion', description: 'Notion Workspace' },
            { id: 'trello', label: 'trello', description: 'Trello Boards' },
            { id: 'obsidian', label: 'obsidian', description: 'Obsidian Vault' },
            { id: 'bear_notes', label: 'bear-notes', description: 'Bear Notes (Mac)' },
            { id: 'things3', label: 'things3', description: 'Things3 (Mac)' },
            { id: 'onepassword', label: 'onepassword', description: '1Password CLI' }
        ]
    },
    {
        id: 'social',
        label: 'Social',
        tools: [
            { id: 'twitter', label: 'twitter', description: 'Twitter/X' },
            { id: 'reddit', label: 'reddit', description: 'Reddit' },
            { id: 'linkedin', label: 'linkedin', description: 'LinkedIn' }
        ]
    },
    {
        id: 'utilities',
        label: 'Utilities',
        tools: [
            { id: 'weather', label: 'weather', description: 'Weather' },
            { id: 'voice', label: 'voice', description: 'Speech & Voice' },
            { id: 'skill', label: 'skill', description: 'Execute Skill' },
            { id: 'echo', label: 'echo', description: 'Echo Debug' }
        ]
    }
] as const;

const PROFILE_OPTIONS = [
    { id: 'minimal', label: 'Minimal' },
    { id: 'coding', label: 'Coding' },
    { id: 'messaging', label: 'Messaging' },
    { id: 'full', label: 'Full' }
] as const;

const CHANNEL_EXTRA_FIELDS = ['groupPolicy', 'streamMode', 'dmPolicy'] as const;

const CHANNEL_LABELS: Record<string, string> = {
    discord: 'Discord',
    slack: 'Slack',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    matrix: 'Matrix',
    signal: 'Signal',
    twitter: 'Twitter/X',
    linkedin: 'LinkedIn',
    email: 'Email',
    bluebubbles: 'BlueBubbles',
    imessage: 'iMessage',
    'nextcloud-talk': 'Nextcloud Talk',
    webchat: 'WebChat',
    msteams: 'Microsoft Teams',
    googlechat: 'Google Chat',
    nostr: 'Nostr',
    line: 'LINE',
    twitch: 'Twitch'
};

const CHANNEL_CONFIG_ALIASES: Record<string, string[]> = {
    msteams: ['teams', 'msTeams', 'microsoftTeams'],
    googlechat: ['googleChat', 'google-chat', 'gchat'],
    'nextcloud-talk': ['nextcloudTalk', 'nextcloudtalk'],
    bluebubbles: ['blueBubbles'],
    imessage: ['iMessage'],
    webchat: ['webChat']
};

function normalizeChannelId(raw: string): string {
    const lowered = String(raw || '').trim().toLowerCase();
    if (!lowered) return '';
    if (lowered === 'teams' || lowered === 'msteams') return 'msteams';
    if (lowered === 'googlechat' || lowered === 'google-chat' || lowered === 'gchat') return 'googlechat';
    if (lowered === 'nextcloudtalk' || lowered === 'nextcloud-talk' || lowered.startsWith('nextcloud-')) {
        return 'nextcloud-talk';
    }
    if (lowered.startsWith('bluebubbles-')) return 'bluebubbles';
    if (lowered.startsWith('nostr-')) return 'nostr';
    return lowered;
}

function resolveChannelConfig(configChannels: Record<string, any>, channelId: string): any {
    const candidates = [channelId, ...(CHANNEL_CONFIG_ALIASES[channelId] || [])];
    for (const candidate of candidates) {
        if (Object.prototype.hasOwnProperty.call(configChannels, candidate)) {
            return configChannels[candidate] || {};
        }
    }
    const loweredCandidates = new Set(candidates.map((candidate) => candidate.toLowerCase()));
    for (const [key, value] of Object.entries(configChannels)) {
        if (loweredCandidates.has(key.toLowerCase())) {
            return value || {};
        }
    }
    return {};
}

function cloneConfig<T>(value: T): T {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value)) as T;
}

function isDefaultAgentId(agentId: string): boolean {
    return agentId === 'main' || agentId === 'default';
}

function dirnameFromPath(pathValue?: string): string {
    if (!pathValue) return '';
    const i = Math.max(pathValue.lastIndexOf('/'), pathValue.lastIndexOf('\\'));
    if (i <= 0) return '';
    return pathValue.slice(0, i);
}

function normalizeModelValue(label: string): string {
    const match = label.match(/^(.+) \(\+\d+ fallback\)$/);
    return match ? match[1] : label;
}

function resolveModelLabel(model?: ModelValue): string {
    if (!model) return '-';
    if (typeof model === 'string') {
        return model.trim() || '-';
    }
    const primary = model.primary?.trim();
    if (!primary) return '-';
    const fallbackCount = Array.isArray(model.fallbacks) ? model.fallbacks.length : 0;
    return fallbackCount > 0 ? `${primary} (+${fallbackCount} fallback)` : primary;
}

function resolveModelPrimary(model?: ModelValue): string | null {
    if (!model) return null;
    if (typeof model === 'string') {
        const trimmed = model.trim();
        return trimmed || null;
    }
    const primary = model.primary?.trim();
    return primary || null;
}

function resolveModelFallbacks(model?: ModelValue): string[] {
    if (!model || typeof model === 'string') return [];
    return Array.isArray(model.fallbacks)
        ? model.fallbacks.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];
}

function parseFallbackList(value: string): string[] {
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function normalizeToolName(name: string): string {
    const normalized = name.trim().toLowerCase();
    return TOOL_NAME_ALIASES[normalized] ?? normalized;
}

function expandToolGroups(list?: string[]): string[] {
    if (!Array.isArray(list)) return [];
    const expanded: string[] = [];
    for (const entry of list) {
        const normalized = normalizeToolName(entry);
        if (!normalized) continue;
        const group = TOOL_GROUPS[normalized];
        if (group) {
            expanded.push(...group);
            continue;
        }
        expanded.push(normalized);
    }
    return Array.from(new Set(expanded));
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type CompiledPattern =
    | { kind: 'all' }
    | { kind: 'exact'; value: string }
    | { kind: 'regex'; value: RegExp };

function compilePattern(pattern: string): CompiledPattern {
    const normalized = normalizeToolName(pattern);
    if (!normalized) return { kind: 'exact', value: '' };
    if (normalized === '*') return { kind: 'all' };
    if (!normalized.includes('*')) return { kind: 'exact', value: normalized };
    return { kind: 'regex', value: new RegExp(`^${escapeRegExp(normalized).replaceAll('\\*', '.*')}$`) };
}

function compilePatterns(patterns?: string[]): CompiledPattern[] {
    return expandToolGroups(patterns)
        .map(compilePattern)
        .filter((entry) => entry.kind !== 'exact' || entry.value.length > 0);
}

function matchesAny(name: string, patterns: CompiledPattern[]): boolean {
    for (const pattern of patterns) {
        if (pattern.kind === 'all') return true;
        if (pattern.kind === 'exact' && name === pattern.value) return true;
        if (pattern.kind === 'regex' && pattern.value.test(name)) return true;
    }
    return false;
}

function isAllowedByPolicy(name: string, policy?: { allow?: string[]; deny?: string[] }): boolean {
    if (!policy) return true;
    const normalized = normalizeToolName(name);
    const deny = compilePatterns(policy.deny);
    if (matchesAny(normalized, deny)) return false;

    const allow = compilePatterns(policy.allow);
    if (allow.length === 0) return true;
    if (matchesAny(normalized, allow)) return true;
    if (normalized === 'apply_patch' && matchesAny('exec', allow)) return true;
    return false;
}

function matchesList(name: string, list?: string[]): boolean {
    if (!Array.isArray(list) || list.length === 0) return false;
    const normalized = normalizeToolName(name);
    const patterns = compilePatterns(list);
    if (matchesAny(normalized, patterns)) return true;
    if (normalized === 'apply_patch' && matchesAny('exec', patterns)) return true;
    return false;
}

function resolveToolProfile(profile?: string): { allow?: string[]; deny?: string[] } | undefined {
    if (!profile) return undefined;
    const resolved = TOOL_PROFILES[profile];
    if (!resolved) return undefined;
    if (!resolved.allow && !resolved.deny) return undefined;
    return {
        allow: resolved.allow ? [...resolved.allow] : undefined,
        deny: resolved.deny ? [...resolved.deny] : undefined
    };
}

function resolveAgentEntry(config: AgentConfig | null, agentId: string): AgentEntry | null {
    if (!config?.agents?.list || !Array.isArray(config.agents.list)) return null;
    return config.agents.list.find((entry) => entry?.id === agentId) || null;
}

function ensureAgentEntry(config: AgentConfig, agentId: string): AgentEntry {
    if (!config.agents) config.agents = {};
    if (!Array.isArray(config.agents.list)) config.agents.list = [];
    let entry = config.agents.list.find((item) => item?.id === agentId);
    if (!entry) {
        entry = { id: agentId };
        config.agents.list.push(entry);
    }
    return entry;
}

function cleanupToolPolicy(target: Record<string, any>): void {
    if (Array.isArray(target.allow) && target.allow.length === 0) delete target.allow;
    if (Array.isArray(target.alsoAllow) && target.alsoAllow.length === 0) delete target.alsoAllow;
    if (Array.isArray(target.deny) && target.deny.length === 0) delete target.deny;
    if (typeof target.profile === 'string' && !target.profile.trim()) delete target.profile;
    if (target.exec && typeof target.exec === 'object' && Object.keys(target.exec).length === 0) delete target.exec;
}

function formatRelativeTimestamp(ts: number | null): string {
    if (!ts) return 'never';
    const deltaMs = Date.now() - ts;
    if (deltaMs < 0) return 'just now';
    const sec = Math.floor(deltaMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
}

function formatChannelExtraValue(raw: unknown): string {
    if (raw == null) return 'n/a';
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
        return String(raw);
    }
    try {
        return JSON.stringify(raw);
    } catch {
        return 'n/a';
    }
}

function isChannelConfigured(raw: any): boolean {
    if (!raw || typeof raw !== 'object') return false;
    return Object.entries(raw).some(([key, value]) => {
        if (key === 'enabled') return false;
        if (value == null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (typeof value === 'number' || typeof value === 'boolean') return true;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return false;
    });
}

function summarizeChannelAccounts(accounts: Array<{ connected?: boolean; configured?: boolean; enabled?: boolean; running?: boolean; probe?: any }>) {
    let connected = 0;
    let configured = 0;
    let enabled = 0;

    for (const account of accounts) {
        const probeOk = Boolean(account.probe && typeof account.probe === 'object' && 'ok' in account.probe && (account.probe as any).ok);
        const isConnected = account.connected === true || account.running === true || probeOk;
        if (isConnected) connected += 1;
        if (account.configured) configured += 1;
        if (account.enabled) enabled += 1;
    }

    return { total: accounts.length, connected, configured, enabled };
}

function formatBytes(bytes?: number) {
    if (typeof bytes !== 'number') return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNextWake(nextWakeAtMs: number | null | undefined): string {
    if (!nextWakeAtMs || !Number.isFinite(nextWakeAtMs)) return 'n/a';
    const date = new Date(nextWakeAtMs);
    return date.toLocaleString();
}

export default function AgentPage({ params }: { params: { agentId: string } }) {
    const [activePanel, setActivePanel] = useState<AgentsPanel>('overview');

    const [files, setFiles] = useState<FileMeta[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');

    const [config, setConfig] = useState<AgentConfig | null>(null);
    const [configDraft, setConfigDraft] = useState<AgentConfig | null>(null);
    const [configLoading, setConfigLoading] = useState(false);
    const [configSaving, setConfigSaving] = useState(false);
    const [configStatus, setConfigStatus] = useState('');

    const [identity, setIdentity] = useState<Identity | null>(null);

    const [skills, setSkills] = useState<{ builtIn: SkillInfo[]; workspace: SkillInfo[] }>({ builtIn: [], workspace: [] });
    const [skillFilter, setSkillFilter] = useState('');
    const [refreshingSkills, setRefreshingSkills] = useState(false);

    const [availableChannels, setAvailableChannels] = useState<ChannelStatus[]>([]);
    const [fetchingChannels, setFetchingChannels] = useState(false);
    const [channelsError, setChannelsError] = useState<string | null>(null);
    const [channelsLastSuccess, setChannelsLastSuccess] = useState<number | null>(null);

    const [cronJobs, setCronJobs] = useState<CronJobEntry[]>([]);
    const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
    const [cronLoading, setCronLoading] = useState(false);
    const [cronError, setCronError] = useState<string | null>(null);

    const [installModal, setInstallModal] = useState<{ isOpen: boolean; skill?: any } | null>(null);
    const [installing, setInstalling] = useState(false);
    const [installStatus, setInstallStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
    const [optimisticToggles, setOptimisticToggles] = useState<Record<string, boolean>>({});
    const [availableProviders, setAvailableProviders] = useState<Array<{ id: string; name: string; icon: string; models: string[]; defaultModel: string; authed: boolean }>>([]);

    const resolvedParams = use((params as any)) as any;
    const agentId = resolvedParams?.agentId || 'main';
    const isDefaultAgent = isDefaultAgentId(agentId);

    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['overview', 'files', 'tools', 'skills', 'channels', 'cron'].includes(tab)) {
            setActivePanel(tab as AgentsPanel);
        }
    }, [searchParams]);

    const fetchConfig = async () => {
        setConfigLoading(true);
        try {
            const res = await fetch('/api/config');
            const payload = await res.json();
            const data = payload?.data || payload;
            setConfig(data);
            setConfigDraft(cloneConfig(data));
        } catch (err) {
            console.error('Failed to fetch config', err);
            setConfigStatus('Failed to load config');
        } finally {
            setConfigLoading(false);
        }
    };

    const fetchIdentity = async () => {
        try {
            const res = await fetch(`/api/agent/identity?agentId=${encodeURIComponent(agentId)}`);
            if (!res.headers.get('content-type')?.includes('application/json')) {
                const text = await res.text();
                console.error('[UI] Identity API returned non-JSON:', text.substring(0, 100));
                return;
            }
            const data = await res.json();
            setIdentity(data);
        } catch (err) {
            console.error('Failed to fetch identity', err);
        }
    };

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/agent/files?agentId=${encodeURIComponent(agentId)}`);
            if (!res.headers.get('content-type')?.includes('application/json')) {
                const text = await res.text();
                console.error('[UI] Files API returned non-JSON:', text.substring(0, 100));
                return;
            }
            const data = await res.json();
            if (Array.isArray(data.files)) {
                setFiles(data.files);
            }
        } catch (err) {
            console.error('Failed to fetch files', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSkills = async () => {
        setRefreshingSkills(true);
        try {
            const res = await fetch('/api/skills');
            if (!res.headers.get('content-type')?.includes('application/json')) {
                const text = await res.text();
                console.error('[UI] Skills API returned non-JSON:', text.substring(0, 100));
                return;
            }
            const data = await res.json();
            setSkills({
                builtIn: data.skills || [],
                workspace: data.workspaceSkills || []
            });
        } catch (err) {
            console.error('Failed to fetch skills', err);
        } finally {
            setRefreshingSkills(false);
        }
    };

    const fetchChannels = async () => {
        setFetchingChannels(true);
        setChannelsError(null);
        try {
            const res = await fetch('/api/channels/status');
            if (!res.headers.get('content-type')?.includes('application/json')) {
                const text = await res.text();
                console.error('[UI] Channels API returned non-JSON:', text.substring(0, 100));
                setChannelsError('Invalid channel status response');
                return;
            }
            const data = await res.json();
            const channels = Array.isArray(data.channels) ? data.channels : [];
            setAvailableChannels(channels);
            setChannelsLastSuccess(Date.now());
            if (data.error) {
                setChannelsError(String(data.error));
            }
        } catch (err: any) {
            console.error('Failed to fetch channels', err);
            setChannelsError(err?.message || 'Failed to fetch channels');
        } finally {
            setFetchingChannels(false);
        }
    };

    const fetchCron = async () => {
        setCronLoading(true);
        setCronError(null);
        try {
            const res = await fetch('/api/cron/list');
            if (!res.headers.get('content-type')?.includes('application/json')) {
                const text = await res.text();
                console.error('[UI] Cron API returned non-JSON:', text.substring(0, 100));
                setCronError('Invalid cron response');
                return;
            }
            const data = await res.json();
            setCronJobs(Array.isArray(data.jobs) ? data.jobs : []);
            setCronStatus(data.status || null);
        } catch (err: any) {
            console.error('Failed to fetch cron status', err);
            setCronError(err?.message || 'Failed to fetch cron status');
        } finally {
            setCronLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchIdentity();
        // Fetch available providers for model dropdown
        fetch('/api/providers').then(r => r.json()).then(data => {
            if (Array.isArray(data?.providers)) setAvailableProviders(data.providers);
        }).catch(() => { });
    }, [agentId]);

    useEffect(() => {
        if (activePanel === 'files') fetchFiles();
        if (activePanel === 'skills') fetchSkills();
        if (activePanel === 'channels') fetchChannels();
        if (activePanel === 'cron') fetchCron();
    }, [activePanel, agentId]);

    const configDirty = useMemo(() => {
        return JSON.stringify(configDraft || {}) !== JSON.stringify(config || {});
    }, [configDraft, config]);

    const applyConfigDraft = (mutator: (draft: AgentConfig) => void) => {
        setConfigDraft((prev) => {
            const base = cloneConfig((prev || config || {}) as AgentConfig);
            mutator(base);
            return base;
        });
    };

    const saveConfig = async () => {
        if (!configDraft) return;
        setConfigSaving(true);
        setConfigStatus('Saving config...');
        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configDraft)
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || `HTTP ${res.status}`);
            }
            const payload = await res.json();
            const updated = payload?.data || payload;
            setConfig(updated);
            setConfigDraft(cloneConfig(updated));
            setConfigStatus('Config saved successfully');
            setTimeout(() => setConfigStatus(''), 2000);
        } catch (err: any) {
            console.error('Failed to save config', err);
            setConfigStatus(`Failed to save config: ${err?.message || 'Unknown error'}`);
        } finally {
            setConfigSaving(false);
        }
    };

    const selectFile = async (filename: string) => {
        if (selectedFile === filename && content !== originalContent) {
            if (!confirm('Unsaved changes will be lost. Continue?')) return;
        }

        setSelectedFile(filename);
        setStatus('');
        try {
            const res = await fetch(`/api/agent/files/${filename}?agentId=${encodeURIComponent(agentId)}`);
            const data = await res.json();
            setContent(data.content || '');
            setOriginalContent(data.content || '');
        } catch (err) {
            console.error('Failed to load file', err);
            setStatus('Error loading file');
            setContent('');
        }
    };

    const handleSaveFile = async () => {
        if (!selectedFile) return;
        setSaving(true);
        setStatus('Saving...');
        try {
            const res = await fetch(`/api/agent/files/${selectedFile}?agentId=${encodeURIComponent(agentId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                setOriginalContent(content);
                setStatus('Saved successfully');
                setTimeout(() => setStatus(''), 2000);
                fetchFiles();
            } else {
                setStatus('Failed to save');
            }
        } catch (err) {
            console.error('Failed to save', err);
            setStatus('Error saving');
        } finally {
            setSaving(false);
        }
    };

    const entryFromDraft = resolveAgentEntry(configDraft, agentId);
    const entryFromConfig = resolveAgentEntry(config, agentId);

    const defaultModel = configDraft?.agents?.defaults?.model;
    const entryModel = (isDefaultAgent ? defaultModel : entryFromDraft?.model) as ModelValue | undefined;
    const defaultPrimary = resolveModelPrimary(defaultModel);
    const effectivePrimary = resolveModelPrimary(entryModel) || (!isDefaultAgent ? defaultPrimary : null);
    const fallbackText = resolveModelFallbacks(entryModel).join(', ');

    const modelChoices = useMemo(() => {
        // Build choices from registered providers
        const choices: Array<{ value: string; label: string }> = [];
        const seen = new Set<string>();

        for (const provider of availableProviders) {
            for (const model of provider.models) {
                const value = `${provider.id}/${model}`;
                if (seen.has(value)) continue;
                seen.add(value);
                choices.push({
                    value,
                    label: `${provider.icon} ${provider.name} — ${model}`
                });
            }
        }

        // Ensure the effective primary is in the list even if not from providers
        if (effectivePrimary && !choices.some(c => c.value === effectivePrimary)) {
            choices.unshift({ value: effectivePrimary, label: `Current (${effectivePrimary})` });
        }

        return choices;
    }, [availableProviders, effectivePrimary]);

    const contextWorkspace = useMemo(() => {
        const fromLoadedFile = dirnameFromPath(files.find((file) => file.path)?.path);
        if (fromLoadedFile) return fromLoadedFile;
        const fromEntry = (isDefaultAgent ? null : (entryFromDraft?.workspace || entryFromDraft?.agentDir));
        if (fromEntry && typeof fromEntry === 'string' && fromEntry.trim()) return fromEntry;
        const fromDefaults = configDraft?.agents?.defaults?.workspace;
        if (typeof fromDefaults === 'string' && fromDefaults.trim()) return fromDefaults;
        return 'agent';
    }, [files, configDraft, entryFromDraft, isDefaultAgent]);

    const contextModel = isDefaultAgent
        ? resolveModelLabel(defaultModel as ModelValue | undefined)
        : resolveModelLabel((entryFromDraft?.model as ModelValue | undefined) || (defaultModel as ModelValue | undefined));

    const contextIdentityName = identity?.name?.trim()
        || entryFromDraft?.name?.trim()
        || entryFromConfig?.name?.trim()
        || 'System Agent';

    const contextIdentityEmoji = identity?.emoji?.trim() || '🤖';
    const contextSkillFilter = Array.isArray(entryFromDraft?.skills) ? `${entryFromDraft.skills.length} selected` : 'all skills';

    const updateModelPrimary = (nextPrimary: string | null) => {
        applyConfigDraft((draft) => {
            if (!draft.agents) draft.agents = {};
            if (!draft.agents.defaults) draft.agents.defaults = {};

            if (isDefaultAgent) {
                const current = (typeof draft.agents.defaults.model === 'object' && draft.agents.defaults.model)
                    ? { ...(draft.agents.defaults.model as any) }
                    : {};

                if (nextPrimary && nextPrimary.trim()) {
                    current.primary = nextPrimary.trim();
                } else {
                    delete current.primary;
                }

                if (Object.keys(current).length === 0) {
                    delete draft.agents.defaults!.model;
                } else {
                    draft.agents.defaults!.model = current;
                }
                return;
            }

            const entry = ensureAgentEntry(draft, agentId);
            const current = (typeof entry.model === 'object' && entry.model)
                ? { ...(entry.model as any) }
                : {};

            if (nextPrimary && nextPrimary.trim()) {
                current.primary = nextPrimary.trim();
            } else {
                delete current.primary;
            }

            if (Object.keys(current).length === 0) {
                delete entry.model;
            } else {
                entry.model = current;
            }
        });
    };

    const updateModelFallbacks = (fallbacks: string[]) => {
        applyConfigDraft((draft) => {
            if (!draft.agents) draft.agents = {};
            if (!draft.agents.defaults) draft.agents.defaults = {};

            const applyFallback = (targetModel: any, targetSetter: (value: any | undefined) => void) => {
                const current = (typeof targetModel === 'object' && targetModel)
                    ? { ...targetModel }
                    : {};

                if (fallbacks.length > 0) {
                    current.fallbacks = fallbacks;
                } else {
                    delete current.fallbacks;
                }

                if (Object.keys(current).length === 0) {
                    targetSetter(undefined);
                } else {
                    targetSetter(current);
                }
            };

            if (isDefaultAgent) {
                applyFallback(draft.agents.defaults?.model, (value) => {
                    if (value === undefined) {
                        delete draft.agents!.defaults!.model;
                    } else {
                        draft.agents!.defaults!.model = value;
                    }
                });
                return;
            }

            const entry = ensureAgentEntry(draft, agentId);
            applyFallback(entry.model, (value) => {
                if (value === undefined) {
                    delete entry.model;
                } else {
                    entry.model = value;
                }
            });
        });
    };

    const globalTools = ((configDraft?.tools && typeof configDraft.tools === 'object')
        ? configDraft.tools
        : {}) as Record<string, any>;

    const agentTools = useMemo(() => {
        if (isDefaultAgent) return globalTools;
        const entry = entryFromDraft;
        if (!entry?.tools || typeof entry.tools !== 'object') return {} as Record<string, any>;
        return entry.tools as Record<string, any>;
    }, [isDefaultAgent, globalTools, entryFromDraft]);

    const selectedProfile = (agentTools.profile || (!isDefaultAgent ? globalTools.profile : undefined) || 'full') as string;
    const profileSource = agentTools.profile
        ? 'agent override'
        : globalTools.profile
            ? 'global default'
            : 'default';

    const hasAgentAllow = Array.isArray(agentTools.allow) && agentTools.allow.length > 0;
    const hasGlobalAllow = !isDefaultAgent && Array.isArray(globalTools.allow) && globalTools.allow.length > 0;
    const editableTools = Boolean(configDraft) && !configLoading && !configSaving && !hasAgentAllow;

    const alsoAllow = hasAgentAllow ? [] : (Array.isArray(agentTools.alsoAllow) ? agentTools.alsoAllow : []);
    const deny = hasAgentAllow ? [] : (Array.isArray(agentTools.deny) ? agentTools.deny : []);

    const basePolicy = hasAgentAllow
        ? { allow: Array.isArray(agentTools.allow) ? agentTools.allow : [], deny: Array.isArray(agentTools.deny) ? agentTools.deny : [] }
        : resolveToolProfile(selectedProfile);

    const globalPolicy = hasGlobalAllow
        ? { allow: Array.isArray(globalTools.allow) ? globalTools.allow : [], deny: Array.isArray(globalTools.deny) ? globalTools.deny : [] }
        : undefined;

    const resolveToolAllowed = (toolId: string) => {
        const normalized = normalizeToolName(toolId);
        const globalAllowed = globalPolicy ? isAllowedByPolicy(normalized, globalPolicy) : true;
        const baseAllowed = isAllowedByPolicy(normalized, basePolicy);
        const extraAllowed = matchesList(normalized, alsoAllow);
        const denied = matchesList(normalized, deny);
        const allowed = globalAllowed && (baseAllowed || extraAllowed) && !denied;
        return { allowed, baseAllowed, globalAllowed };
    };

    const toolIds = TOOL_SECTIONS.flatMap((section) => section.tools.map((tool) => tool.id));
    const enabledToolCount = toolIds.filter((toolId) => resolveToolAllowed(toolId).allowed).length;

    const mutateToolPolicy = (mutator: (target: Record<string, any>) => void) => {
        applyConfigDraft((draft) => {
            if (isDefaultAgent) {
                if (!draft.tools || typeof draft.tools !== 'object') draft.tools = {};
                const target = draft.tools as Record<string, any>;
                mutator(target);
                cleanupToolPolicy(target);
                return;
            }

            const entry = ensureAgentEntry(draft, agentId);
            if (!entry.tools || typeof entry.tools !== 'object') entry.tools = {};
            const target = entry.tools as Record<string, any>;
            mutator(target);
            cleanupToolPolicy(target);
            if (Object.keys(target).length === 0) {
                delete entry.tools;
            }
        });
    };

    const handleToolsProfileChange = (profile: string | null, clearAllow: boolean) => {
        mutateToolPolicy((target) => {
            if (profile && profile.trim()) {
                target.profile = profile.trim();
            } else {
                delete target.profile;
            }
            if (clearAllow) {
                delete target.allow;
            }
        });
    };

    const handleToolsOverridesChange = (nextAlsoAllow: string[], nextDeny: string[]) => {
        mutateToolPolicy((target) => {
            target.alsoAllow = nextAlsoAllow.length > 0 ? Array.from(new Set(nextAlsoAllow.map(normalizeToolName).filter(Boolean))) : undefined;
            target.deny = nextDeny.length > 0 ? Array.from(new Set(nextDeny.map(normalizeToolName).filter(Boolean))) : undefined;
        });
    };

    const toggleTool = (toolId: string, nextEnabled: boolean) => {
        if (!editableTools) return;
        const normalized = normalizeToolName(toolId);
        if (globalPolicy && !isAllowedByPolicy(normalized, globalPolicy)) return;

        const nextAllow = new Set(alsoAllow.map(normalizeToolName).filter(Boolean));
        const nextDeny = new Set(deny.map(normalizeToolName).filter(Boolean));
        const { baseAllowed } = resolveToolAllowed(normalized);

        if (nextEnabled) {
            nextDeny.delete(normalized);
            if (!baseAllowed) nextAllow.add(normalized);
        } else {
            nextAllow.delete(normalized);
            nextDeny.add(normalized);
        }

        handleToolsOverridesChange([...nextAllow], [...nextDeny]);
    };

    const toggleAllTools = (nextEnabled: boolean) => {
        if (!editableTools) return;

        const nextAllow = new Set(alsoAllow.map(normalizeToolName).filter(Boolean));
        const nextDeny = new Set(deny.map(normalizeToolName).filter(Boolean));

        for (const toolId of toolIds) {
            const normalized = normalizeToolName(toolId);
            if (globalPolicy && !isAllowedByPolicy(normalized, globalPolicy)) {
                continue;
            }
            const { baseAllowed } = resolveToolAllowed(normalized);
            if (nextEnabled) {
                nextDeny.delete(normalized);
                if (!baseAllowed) nextAllow.add(normalized);
            } else {
                nextAllow.delete(normalized);
                nextDeny.add(normalized);
            }
        }

        handleToolsOverridesChange([...nextAllow], [...nextDeny]);
    };

    const channelEntries = useMemo(() => {
        const configChannels = (configDraft?.channels && typeof configDraft.channels === 'object')
            ? configDraft.channels as Record<string, any>
            : {};

        const ids = new Set<string>();
        for (const key of Object.keys(configChannels)) ids.add(normalizeChannelId(key));
        for (const channel of availableChannels) ids.add(normalizeChannelId(channel.id));

        const ordered = Array.from(ids);
        ordered.sort((a, b) => {
            const aLive = availableChannels.findIndex((channel) => normalizeChannelId(channel.id) === a);
            const bLive = availableChannels.findIndex((channel) => normalizeChannelId(channel.id) === b);
            if (aLive !== -1 && bLive !== -1) return aLive - bLive;
            if (aLive !== -1) return -1;
            if (bLive !== -1) return 1;
            return a.localeCompare(b);
        });

        return ordered.map((id) => {
            const live = availableChannels.find((channel) => normalizeChannelId(channel.id) === id);
            const cfg = resolveChannelConfig(configChannels, id);
            const enabled = typeof cfg.enabled === 'boolean' ? cfg.enabled : Boolean(live?.enabled);
            const configured = typeof live?.configured === 'boolean' ? live.configured : isChannelConfigured(cfg);
            const connected = Boolean(live?.status === 'Active' || live?.health?.connected || live?.probe?.ok);
            const accounts = [{
                connected,
                running: connected,
                configured,
                enabled,
                probe: live?.probe
            }];
            const extras = CHANNEL_EXTRA_FIELDS.flatMap((field) => {
                if (!(field in cfg)) return [];
                return [{ label: field, value: formatChannelExtraValue(cfg[field]) }];
            });

            return {
                id,
                label: live?.name || CHANNEL_LABELS[id] || id,
                accounts,
                extras
            };
        });
    }, [availableChannels, configDraft]);

    const agentCronJobs = useMemo(() => {
        return cronJobs.filter((job) => {
            if (job.agentId && job.agentId.trim()) {
                return job.agentId === agentId;
            }
            return isDefaultAgent;
        });
    }, [cronJobs, agentId, isDefaultAgent]);

    const isDirty = content !== originalContent;

    const agentList = useMemo(() => {
        const list = config?.agents?.list;
        if (Array.isArray(list) && list.length > 0) return list;
        return [{ id: 'main', name: 'System Agent', default: true }] as AgentEntry[];
    }, [config?.agents?.list]);

    const defaultAgentId = useMemo(() => {
        const d = agentList.find((a) => a.default);
        if (d) return d.id;
        return agentList[0]?.id ?? 'main';
    }, [agentList]);

    return (
        <div className="flex flex-row h-full overflow-hidden" style={{ background: 'var(--pd-surface-main)', color: 'var(--pd-text-main)' }}>
            <aside className="w-56 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--pd-border)' }}>
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <div className="font-bold text-sm">Agents</div>
                            <div className="text-[10px] opacity-70">{agentList.length} configured.</div>
                        </div>
                        <button
                            type="button"
                            onClick={fetchConfig}
                            disabled={configLoading}
                            className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-90 disabled:opacity-50"
                            style={{ borderColor: 'var(--pd-border)' }}
                        >
                            {configLoading ? '…' : 'Refresh'}
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {agentList.length === 0 ? (
                        <div className="text-xs opacity-70 py-2">No agents found.</div>
                    ) : (
                        agentList.map((agent) => {
                            const label = agent.name || agent.id;
                            const isSelected = agent.id === agentId;
                            const isDefault = agent.id === defaultAgentId;
                            return (
                                <Link
                                    key={agent.id}
                                    href={`/agents/${agent.id}`}
                                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${isSelected ? 'font-semibold' : 'opacity-80 hover:opacity-100'}`}
                                    style={{
                                        background: isSelected ? 'var(--pd-surface-highlight)' : 'transparent',
                                        color: isSelected ? 'var(--pd-text-main)' : 'var(--pd-text-muted)'
                                    }}
                                >
                                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: 'var(--pd-surface-main)' }}>
                                        {agent.id === 'main' ? '🤖' : (label.charAt(0) || '?').toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate">{label}</div>
                                        <div className="text-[10px] font-mono truncate opacity-70">{agent.id}</div>
                                    </div>
                                    {isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--pd-accent)', color: '#fff' }}>DEFAULT</span>}
                                </Link>
                            );
                        })
                    )}
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="border-b px-6 py-4 shrink-0" style={{ borderColor: 'var(--pd-border)' }}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: 'var(--pd-surface-panel)' }}>
                            {contextIdentityEmoji || '🤖'}
                        </div>
                        <div>
                            <div className="font-bold text-lg">{contextIdentityName}</div>
                            <div className="text-xs opacity-70">Agent workspace and routing.</div>
                        </div>
                    </div>

                    <div className="flex gap-6 text-sm overflow-x-auto">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'files', label: 'Files' },
                            { id: 'tools', label: 'Tools' },
                            { id: 'skills', label: 'Skills' },
                            { id: 'channels', label: 'Channels' },
                            { id: 'cron', label: 'Cron Jobs' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActivePanel(tab.id as AgentsPanel)}
                                className={`pb-2 transition-colors capitalize whitespace-nowrap ${activePanel === tab.id ? 'font-bold border-b-2' : 'opacity-60 hover:opacity-100'}`}
                                style={{ borderColor: activePanel === tab.id ? 'var(--pd-accent)' : 'transparent' }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-6">
                    {activePanel === 'overview' && (
                        <div className="h-full overflow-y-auto pr-2 space-y-5">
                            <section className="rounded-lg border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                <h3 className="font-bold mb-1">Overview</h3>
                                <p className="text-sm opacity-70">Workspace paths and identity metadata.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Workspace</div>
                                        <div className="font-mono text-sm mt-1 break-all">{contextWorkspace}</div>
                                    </div>
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Primary Model</div>
                                        <div className="font-mono text-sm mt-1">{contextModel || effectivePrimary || '—'}</div>
                                        {fallbackText && (
                                            <div className="mt-2">
                                                <div className="text-[10px] uppercase tracking-wider opacity-60">Fallback Chain</div>
                                                <div className="font-mono text-xs mt-1 opacity-80">{fallbackText}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Identity Name</div>
                                        <div className="text-sm mt-1">{contextIdentityName}</div>
                                    </div>
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Default</div>
                                        <div className="text-sm mt-1">{isDefaultAgent ? 'yes' : 'no'}</div>
                                    </div>
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Identity Emoji</div>
                                        <div className="text-sm mt-1">{contextIdentityEmoji}</div>
                                    </div>
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Skills Filter</div>
                                        <div className="text-sm mt-1">{contextSkillFilter}</div>
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--pd-border)' }}>
                                    <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-3">Model Selection</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <label className="block text-sm">
                                            <span className="opacity-70 block mb-1">Primary model{isDefaultAgent ? ' (default)' : ''}</span>
                                            <select
                                                className="w-full p-2 rounded border bg-[var(--pd-surface-main)] text-[var(--pd-text-main)]"
                                                style={{ borderColor: 'var(--pd-border)' }}
                                                value={effectivePrimary || ''}
                                                disabled={!configDraft || configLoading || configSaving}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    updateModelPrimary(value || null);
                                                }}
                                            >
                                                {!isDefaultAgent && (
                                                    <option value="">
                                                        {defaultPrimary ? `Inherit default (${defaultPrimary})` : 'Inherit default'}
                                                    </option>
                                                )}
                                                {modelChoices.length === 0 && <option value="" disabled>No configured models</option>}
                                                {modelChoices.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="block text-sm">
                                            <span className="opacity-70 block mb-1">Fallbacks (comma-separated)</span>
                                            <input
                                                className="w-full p-2 rounded border bg-[var(--pd-surface-main)] text-[var(--pd-text-main)]"
                                                style={{ borderColor: 'var(--pd-border)' }}
                                                value={fallbackText}
                                                placeholder="provider/model, provider/model"
                                                disabled={!configDraft || configLoading || configSaving}
                                                onChange={(e) => updateModelFallbacks(parseFallbackList(e.target.value))}
                                            />
                                        </label>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <div className="text-xs opacity-70">{configStatus}</div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={fetchConfig}
                                                disabled={configLoading || configSaving}
                                                className="px-3 py-1.5 rounded border text-xs hover:opacity-90 disabled:opacity-50"
                                                style={{ borderColor: 'var(--pd-border)' }}
                                            >
                                                Reload Config
                                            </button>
                                            <button
                                                onClick={saveConfig}
                                                disabled={configSaving || !configDirty}
                                                className="px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-50"
                                                style={{ background: 'var(--pd-accent)' }}
                                            >
                                                {configSaving ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activePanel === 'files' && (
                        <div className="flex h-full gap-6">
                            <div className="w-80 flex flex-col rounded-lg border overflow-hidden shrink-0" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                <div className="p-3 border-b text-xs font-bold uppercase tracking-wider opacity-70 flex justify-between items-center" style={{ borderColor: 'var(--pd-border)' }}>
                                    <span>Core Files</span>
                                    <button onClick={fetchFiles} className="hover:text-[var(--pd-accent)]" title="Refresh">↻</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {loading && files.length === 0 && <div className="p-4 text-center opacity-50 text-sm">Loading...</div>}
                                    {files.map((file) => (
                                        <button
                                            key={file.name}
                                            onClick={() => selectFile(file.name)}
                                            className={`w-full text-left p-3 rounded-md transition-all border ${selectedFile === file.name ? 'border-[var(--pd-accent)]' : 'border-transparent'}`}
                                            style={{ background: selectedFile === file.name ? 'rgba(var(--pd-accent-rgb), 0.1)' : 'transparent' }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="font-mono text-sm font-medium">{file.name}</div>
                                                {file.missing && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Missing</span>}
                                            </div>
                                            <div className="flex justify-between mt-1 text-[10px] opacity-60">
                                                <span>{formatBytes(file.size)}</span>
                                                <span>{file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col rounded-lg border overflow-hidden" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                {selectedFile ? (
                                    <>
                                        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="flex flex-col">
                                                <span className="font-mono text-sm font-bold">{selectedFile}</span>
                                                <span className="text-[10px] opacity-50 font-mono text-xs">{files.find((f) => f.name === selectedFile)?.path || ''}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs opacity-70">{status}</span>
                                                <button
                                                    onClick={handleSaveFile}
                                                    disabled={!isDirty || saving}
                                                    className="px-4 py-1.5 rounded text-xs font-bold text-white transition-opacity disabled:opacity-50"
                                                    style={{ background: 'var(--pd-accent)' }}
                                                >
                                                    {saving ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="flex-1 w-full bg-transparent p-4 font-mono text-sm resize-none focus:outline-none"
                                            spellCheck={false}
                                        />
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center opacity-40 text-sm">Select a file to view or edit</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activePanel === 'tools' && (
                        <div className="h-full overflow-y-auto pr-2">
                            <section className="rounded-lg border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold">Tool Access</h3>
                                        <p className="text-sm opacity-70">
                                            Profile + per-tool overrides for this agent. <span className="font-mono">{enabledToolCount}/{toolIds.length}</span> enabled.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            className="px-3 py-1.5 rounded border text-xs disabled:opacity-50"
                                            style={{ borderColor: 'var(--pd-border)' }}
                                            disabled={!editableTools}
                                            onClick={() => toggleAllTools(true)}
                                        >
                                            Enable All
                                        </button>
                                        <button
                                            className="px-3 py-1.5 rounded border text-xs disabled:opacity-50"
                                            style={{ borderColor: 'var(--pd-border)' }}
                                            disabled={!editableTools}
                                            onClick={() => toggleAllTools(false)}
                                        >
                                            Disable All
                                        </button>
                                        <button
                                            className="px-3 py-1.5 rounded border text-xs disabled:opacity-50"
                                            style={{ borderColor: 'var(--pd-border)' }}
                                            disabled={configLoading || configSaving}
                                            onClick={fetchConfig}
                                        >
                                            Reload Config
                                        </button>
                                        <button
                                            className="px-3 py-1.5 rounded text-xs font-bold text-white disabled:opacity-50"
                                            style={{ background: 'var(--pd-accent)' }}
                                            disabled={configSaving || !configDirty}
                                            onClick={saveConfig}
                                        >
                                            {configSaving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>

                                {!configDraft && (
                                    <div className="mt-3 p-3 rounded border bg-blue-500/10 border-blue-500/20 text-sm text-blue-200">
                                        Load the gateway config to adjust tool profiles.
                                    </div>
                                )}

                                {hasAgentAllow && (
                                    <div className="mt-3 p-3 rounded border bg-blue-500/10 border-blue-500/20 text-sm text-blue-200">
                                        This agent is using an explicit allowlist in config. Tool overrides are managed in the config file.
                                    </div>
                                )}

                                {hasGlobalAllow && (
                                    <div className="mt-3 p-3 rounded border bg-blue-500/10 border-blue-500/20 text-sm text-blue-200">
                                        Global <span className="font-mono">tools.allow</span> is set. Agent overrides cannot enable tools that are globally blocked.
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Profile</div>
                                        <div className="font-mono text-sm mt-1">{selectedProfile}</div>
                                    </div>
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Source</div>
                                        <div className="text-sm mt-1">{profileSource}</div>
                                    </div>
                                    <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                        <div className="text-[10px] uppercase tracking-wider opacity-60">Status</div>
                                        <div className="font-mono text-sm mt-1">{configDirty ? 'unsaved' : 'clean'}</div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="text-[10px] uppercase tracking-wider opacity-60 mb-2">Quick Presets</div>
                                    <div className="flex flex-wrap gap-2">
                                        {PROFILE_OPTIONS.map((option) => (
                                            <button
                                                key={option.id}
                                                className={`px-3 py-1.5 rounded border text-xs disabled:opacity-50 ${selectedProfile === option.id ? 'font-bold' : ''}`}
                                                style={{ borderColor: selectedProfile === option.id ? 'var(--pd-accent)' : 'var(--pd-border)' }}
                                                disabled={!editableTools}
                                                onClick={() => handleToolsProfileChange(option.id, true)}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                        <button
                                            className="px-3 py-1.5 rounded border text-xs disabled:opacity-50"
                                            style={{ borderColor: 'var(--pd-border)' }}
                                            disabled={!editableTools}
                                            onClick={() => handleToolsProfileChange(null, false)}
                                        >
                                            Inherit
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {TOOL_SECTIONS.map((section) => (
                                        <div key={section.id} className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="font-bold text-sm mb-3">{section.label}</div>
                                            <div className="space-y-2">
                                                {section.tools.map((tool) => {
                                                    const { allowed, globalAllowed } = resolveToolAllowed(tool.id);
                                                    const globallyLocked = globalPolicy ? !globalAllowed : false;
                                                    return (
                                                        <div key={tool.id} className="rounded border p-2 flex items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                                            <div>
                                                                <div className="font-mono text-xs">{tool.label}</div>
                                                                <div className="text-[11px] opacity-65">{tool.description}</div>
                                                                {globallyLocked && (
                                                                    <div className="text-[10px] text-yellow-300 opacity-90 mt-1">Blocked by global allowlist</div>
                                                                )}
                                                            </div>
                                                            <label className={`relative inline-flex items-center cursor-pointer ${(!editableTools || globallyLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only peer"
                                                                    checked={allowed}
                                                                    disabled={!editableTools || globallyLocked}
                                                                    onChange={(e) => toggleTool(tool.id, e.target.checked)}
                                                                />
                                                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--pd-accent)]"></div>
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {activePanel === 'skills' && (
                        <div className="flex flex-col h-full overflow-hidden">
                            {installModal && (
                                <Modal
                                    isOpen={installModal.isOpen}
                                    onClose={() => {
                                        if (!installing) {
                                            setInstallModal(null);
                                            setInstallStatus({ type: null, message: '' });
                                        }
                                    }}
                                    title={`Install Dependencies: ${installModal.skill.name}`}
                                    type="info"
                                    footer={
                                        <>
                                            {installStatus.type === 'success' ? (
                                                <button
                                                    onClick={() => {
                                                        setInstallModal(null);
                                                        setInstallStatus({ type: null, message: '' });
                                                    }}
                                                    className="px-4 py-2 rounded text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
                                                >
                                                    Done
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setInstallModal(null);
                                                            setInstallStatus({ type: null, message: '' });
                                                        }}
                                                        disabled={installing}
                                                        className="px-4 py-2 rounded text-sm hover:bg-[var(--pd-surface-element)] transition-colors disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setInstalling(true);
                                                            setInstallStatus({ type: null, message: '' });
                                                            try {
                                                                const res = await fetch(`/api/skills/${installModal.skill.id}/install`, { method: 'POST' });

                                                                let data;
                                                                try {
                                                                    data = await res.json();
                                                                } catch {
                                                                    throw new Error(`Server returned non-JSON response (status ${res.status}). Check server logs.`);
                                                                }

                                                                if (data.success) {
                                                                    setInstallStatus({ type: 'success', message: 'Installation successful!' });
                                                                    await fetchSkills();
                                                                } else {
                                                                    setInstallStatus({ type: 'error', message: data.message || 'Installation failed.' });
                                                                }
                                                            } catch (e: any) {
                                                                console.error('[UI] Install error:', e);
                                                                setInstallStatus({ type: 'error', message: e.message || 'An error occurred.' });
                                                            } finally {
                                                                setInstalling(false);
                                                            }
                                                        }}
                                                        disabled={installing}
                                                        className="px-4 py-2 rounded text-sm font-bold text-white bg-[var(--pd-accent)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {installing ? (
                                                            <>
                                                                <span className="animate-spin">↻</span> Installing...
                                                            </>
                                                        ) : (
                                                            'Confirm Install'
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    }
                                >
                                    <div className="space-y-4">
                                        {installStatus.message && (
                                            <div className={`p-3 rounded text-sm border ${installStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-200' : 'bg-red-500/10 border-red-500/20 text-red-200'}`}>
                                                {installStatus.message}
                                            </div>
                                        )}

                                        {!installStatus.type && (
                                            <>
                                                <p className="text-sm opacity-80">
                                                    This skill requires system dependencies. The following commands will be run:
                                                </p>
                                                <div className="bg-black/30 p-3 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                                                    {installModal.skill.install?.map((i: any) => {
                                                        if (i.kind === 'brew') return `brew install ${i.formula}`;
                                                        if (i.kind === 'go') return `go install ${i.module}`;
                                                        return i.label || 'Unknown installation steps';
                                                    }).join('\n')}
                                                </div>
                                                <p className="text-[10px] opacity-50">
                                                    The user running the service must have permissions to execute these commands.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </Modal>
                            )}

                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold">Agent Skills</h3>
                                    <p className="text-sm opacity-70">Enable or disable skills for this agent.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Filter skills..."
                                            value={skillFilter}
                                            onChange={(e) => setSkillFilter(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 text-sm rounded-md border bg-[var(--pd-surface-main)] focus:border-[var(--pd-accent)] outline-none"
                                            style={{ borderColor: 'var(--pd-border)' }}
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-2 w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </div>
                                    <button onClick={fetchSkills} className="text-sm opacity-70 hover:opacity-100 flex items-center gap-1">
                                        <span className={refreshingSkills ? 'animate-spin' : ''}>↻</span> Refresh
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 pb-10">
                                {[...skills.builtIn, ...skills.workspace]
                                    .filter((s) => s.name.toLowerCase().includes(skillFilter.toLowerCase()) || (s.description || '').toLowerCase().includes(skillFilter.toLowerCase()))
                                    .sort((a, b) => {
                                        if (a.status === 'blocked' && b.status !== 'blocked') return 1;
                                        if (a.status !== 'blocked' && b.status === 'blocked') return -1;
                                        return a.name.localeCompare(b.name);
                                    })
                                    .map((skill) => {
                                        const configEnabled = configDraft?.skills?.entries?.[skill.id]?.enabled;
                                        const isEnabled = optimisticToggles[skill.id] ?? (configEnabled !== undefined ? configEnabled : true);
                                        const isBlocked = skill.status === 'blocked';
                                        const configEntry = (configDraft?.skills as any)?.entries?.[skill.id] || {};
                                        const apiKey = configEntry.apiKey || skill.apiKey || '';

                                        const sourceBadge = skill.source === 'powerdirector-bundled'
                                            ? { label: 'Bundled', color: 'bg-blue-500/20 text-blue-400' }
                                            : { label: 'Workspace', color: 'bg-purple-500/20 text-purple-400' };

                                        const statusBadge = isBlocked
                                            ? { label: 'Blocked', color: 'bg-red-500/20 text-red-400', icon: '⛔' }
                                            : skill.hasRunner ? { label: 'Executable', color: 'bg-green-500/20 text-green-400', icon: '⚡' }
                                                : { label: 'Knowledge', color: 'bg-yellow-500/20 text-yellow-400', icon: '🧠' };

                                        return (
                                            <div key={skill.id} className="mb-4 p-4 rounded-lg border bg-[var(--pd-surface-panel)] text-left transition-all hover:bg-[var(--pd-surface-element)]" style={{ borderColor: isEnabled ? 'var(--pd-accent)' : 'var(--pd-border)' }}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-bold text-lg">{skill.name}</div>
                                                        <div className="flex gap-2">
                                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${sourceBadge.color}`}>
                                                                {sourceBadge.label}
                                                            </span>
                                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${statusBadge.color}`}>
                                                                <span>{statusBadge.icon}</span> {statusBadge.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <label className={`relative inline-flex items-center cursor-pointer ${isBlocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={isEnabled}
                                                                onChange={async (e) => {
                                                                    const newState = e.target.checked;
                                                                    const previousState = configDraft?.skills?.entries?.[skill.id]?.enabled;

                                                                    applyConfigDraft((draft) => {
                                                                        if (!draft.skills) draft.skills = { entries: {} };
                                                                        if (!draft.skills.entries) draft.skills.entries = {};
                                                                        const current = draft.skills.entries[skill.id] || { enabled: true };
                                                                        draft.skills.entries[skill.id] = {
                                                                            ...current,
                                                                            enabled: newState
                                                                        };
                                                                    });
                                                                    setOptimisticToggles((prev) => ({ ...prev, [skill.id]: newState }));

                                                                    try {
                                                                        const res = await fetch(`/api/skills/${skill.id}/config`, {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ enabled: newState })
                                                                        });
                                                                        if (!res.ok) throw new Error('Failed to update');
                                                                        await fetchConfig();
                                                                    } catch (err) {
                                                                        console.error('[UI] Toggle failed:', err);
                                                                        applyConfigDraft((draft) => {
                                                                            if (!draft.skills) draft.skills = { entries: {} };
                                                                            if (!draft.skills.entries) draft.skills.entries = {};
                                                                            const current = draft.skills.entries[skill.id] || { enabled: true };
                                                                            if (previousState === undefined) {
                                                                                delete draft.skills.entries[skill.id];
                                                                            } else {
                                                                                draft.skills.entries[skill.id] = {
                                                                                    ...current,
                                                                                    enabled: previousState
                                                                                };
                                                                            }
                                                                        });
                                                                        setOptimisticToggles((prev) => {
                                                                            const next = { ...prev };
                                                                            delete next[skill.id];
                                                                            return next;
                                                                        });
                                                                    } finally {
                                                                        setOptimisticToggles((prev) => {
                                                                            const next = { ...prev };
                                                                            delete next[skill.id];
                                                                            return next;
                                                                        });
                                                                    }
                                                                }}
                                                            />
                                                            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--pd-accent)]"></div>
                                                        </label>
                                                    </div>
                                                </div>

                                                {isBlocked && (
                                                    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-md p-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className="text-red-400 mt-0.5">⚠️</div>
                                                            <div className="flex-1">
                                                                <div className="text-xs font-bold text-red-300 uppercase mb-1">Missing Dependencies</div>
                                                                <div className="text-sm text-red-200 mb-2">
                                                                    This skill requires binaries: <span className="font-mono bg-black/30 px-1 rounded">{skill.missingBins?.join(', ')}</span>
                                                                </div>
                                                                {(skill.install && skill.install.length > 0) ? (
                                                                    <button
                                                                        onClick={() => setInstallModal({ isOpen: true, skill: skill })}
                                                                        className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 px-3 py-1.5 rounded transition-colors flex items-center gap-2 border border-red-500/30"
                                                                    >
                                                                        <span>⬇️</span> Install Dependencies
                                                                    </button>
                                                                ) : (
                                                                    <div className="text-xs opacity-60 italic">No automatic installation available.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {skill.requiresApiKey && (
                                                    <div className="mt-2 mb-2 p-2 bg-black/20 rounded">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">API Key</span>
                                                        </div>
                                                        <input
                                                            type="password"
                                                            placeholder="Enter API Key..."
                                                            defaultValue={apiKey}
                                                            onBlur={(e) => {
                                                                const newKey = e.target.value;
                                                                if (newKey !== apiKey) {
                                                                    fetch(`/api/skills/${skill.id}/config`, {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ apiKey: newKey })
                                                                    }).finally(() => fetchConfig());
                                                                }
                                                            }}
                                                            className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs font-mono focus:border-[var(--pd-accent)] outline-none"
                                                        />
                                                    </div>
                                                )}

                                                <div className="text-sm opacity-70 mb-2">{skill.description}</div>

                                                <div className="mt-3 flex items-center gap-4 text-[10px] opacity-40 font-mono">
                                                    <span>ID: {skill.id}</span>
                                                    {skill.version && <span>v{skill.version}</span>}
                                                    {skill.author && <span>by {skill.author}</span>}
                                                    <span className="ml-auto">{skill.dir}</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                {refreshingSkills && [...skills.builtIn, ...skills.workspace].length === 0 && (
                                    <div className="text-center opacity-50 py-12 flex flex-col items-center gap-2">
                                        <div className="animate-spin text-xl">↻</div>
                                        <div>Loading skills...</div>
                                    </div>
                                )}
                                {!refreshingSkills && [...skills.builtIn, ...skills.workspace].length === 0 && (
                                    <div className="text-center opacity-50 py-12">No skills found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activePanel === 'channels' && (
                        <div className="h-full overflow-y-auto pr-2 space-y-4">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <section className="rounded-lg border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                    <h3 className="font-bold">Agent Context</h3>
                                    <p className="text-sm opacity-70">Workspace, identity, and model configuration.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Workspace</div>
                                            <div className="font-mono text-xs mt-1 break-all">{contextWorkspace}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Primary Model</div>
                                            <div className="font-mono text-xs mt-1">{contextModel}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Identity Name</div>
                                            <div className="text-sm mt-1">{contextIdentityName}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Identity Emoji</div>
                                            <div className="text-sm mt-1">{contextIdentityEmoji}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Skills Filter</div>
                                            <div className="text-sm mt-1">{contextSkillFilter}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Default</div>
                                            <div className="text-sm mt-1">{isDefaultAgent ? 'yes' : 'no'}</div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-lg border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold">Channels</h3>
                                            <p className="text-sm opacity-70">Gateway-wide channel status snapshot.</p>
                                        </div>
                                        <button
                                            onClick={fetchChannels}
                                            disabled={fetchingChannels}
                                            className="px-3 py-1.5 rounded border text-xs disabled:opacity-50"
                                            style={{ borderColor: 'var(--pd-border)' }}
                                        >
                                            {fetchingChannels ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>

                                    <div className="text-xs opacity-70 mt-2">Last refresh: {formatRelativeTimestamp(channelsLastSuccess)}</div>
                                    {channelsError && (
                                        <div className="mt-3 p-3 rounded border bg-red-500/10 border-red-500/20 text-red-200 text-sm">
                                            {channelsError}
                                        </div>
                                    )}
                                    {!channelsError && channelEntries.length === 0 && (
                                        <div className="mt-3 p-3 rounded border bg-blue-500/10 border-blue-500/20 text-blue-200 text-sm">
                                            Load channels to see live status.
                                        </div>
                                    )}
                                </section>
                            </div>

                            <section className="rounded-lg border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                {channelEntries.length === 0 ? (
                                    <div className="text-sm opacity-60">No channels found.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {channelEntries.map((entry) => {
                                            const summary = summarizeChannelAccounts(entry.accounts);
                                            const status = summary.total ? `${summary.connected}/${summary.total} connected` : 'no accounts';
                                            const configText = summary.configured ? `${summary.configured} configured` : 'not configured';
                                            const enabledText = summary.total ? `${summary.enabled} enabled` : 'disabled';

                                            return (
                                                <div key={entry.id} className="rounded border p-3 flex items-start justify-between gap-4" style={{ borderColor: 'var(--pd-border)' }}>
                                                    <div>
                                                        <div className="font-medium">{entry.label}</div>
                                                        <div className="text-xs opacity-60 font-mono mt-1">{entry.id}</div>
                                                    </div>
                                                    <div className="text-right text-xs opacity-75 space-y-0.5">
                                                        <div>{status}</div>
                                                        <div>{configText}</div>
                                                        <div>{enabledText}</div>
                                                        {entry.extras.map((extra) => (
                                                            <div key={`${entry.id}-${extra.label}`}>{extra.label}: {extra.value}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {activePanel === 'cron' && (
                        <div className="h-full overflow-y-auto pr-2 space-y-4">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <section className="rounded-lg border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                    <h3 className="font-bold">Agent Context</h3>
                                    <p className="text-sm opacity-70">Workspace and scheduling targets.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Workspace</div>
                                            <div className="font-mono text-xs mt-1 break-all">{contextWorkspace}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Primary Model</div>
                                            <div className="font-mono text-xs mt-1">{contextModel}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Identity Name</div>
                                            <div className="text-sm mt-1">{contextIdentityName}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Default</div>
                                            <div className="text-sm mt-1">{isDefaultAgent ? 'yes' : 'no'}</div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-lg border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold">Scheduler</h3>
                                            <p className="text-sm opacity-70">Gateway cron status.</p>
                                        </div>
                                        <button
                                            onClick={fetchCron}
                                            disabled={cronLoading}
                                            className="px-3 py-1.5 rounded border text-xs disabled:opacity-50"
                                            style={{ borderColor: 'var(--pd-border)' }}
                                        >
                                            {cronLoading ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Enabled</div>
                                            <div className="text-sm mt-1">{cronStatus ? (cronStatus.enabled ? 'Yes' : 'No') : 'n/a'}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Jobs</div>
                                            <div className="text-sm mt-1">{cronStatus?.jobs ?? 'n/a'}</div>
                                        </div>
                                        <div className="rounded border p-3" style={{ borderColor: 'var(--pd-border)' }}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-60">Next wake</div>
                                            <div className="text-sm mt-1">{formatNextWake(cronStatus?.nextWakeAtMs)}</div>
                                        </div>
                                    </div>

                                    {cronError && (
                                        <div className="mt-3 p-3 rounded border bg-red-500/10 border-red-500/20 text-red-200 text-sm">
                                            {cronError}
                                        </div>
                                    )}
                                </section>
                            </div>

                            <section className="rounded-lg border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                <h3 className="font-bold">Agent Cron Jobs</h3>
                                <p className="text-sm opacity-70">Scheduled jobs targeting this agent.</p>

                                {agentCronJobs.length === 0 ? (
                                    <div className="mt-4 text-sm opacity-60">No jobs assigned.</div>
                                ) : (
                                    <div className="space-y-3 mt-4">
                                        {agentCronJobs.map((job) => (
                                            <div key={job.id} className="rounded border p-3 flex items-start justify-between gap-4" style={{ borderColor: 'var(--pd-border)' }}>
                                                <div>
                                                    <div className="font-medium">{job.name}</div>
                                                    {job.description && <div className="text-sm opacity-70 mt-1">{job.description}</div>}
                                                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] uppercase">
                                                        <span className="px-2 py-0.5 rounded bg-[rgba(255,255,255,0.06)] font-mono">{job.schedule}</span>
                                                        <span className={`px-2 py-0.5 rounded ${job.enabled ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                                            {job.enabled ? 'enabled' : 'disabled'}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded bg-[rgba(255,255,255,0.06)]">{job.sessionTarget || job.action || 'message'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs opacity-75">
                                                    <div className="font-mono">{job.channel || 'cron'}</div>
                                                    <div className="max-w-[420px] break-all mt-1">{job.payload || '-'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
