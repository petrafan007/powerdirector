import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getService } from '../../../../lib/agent-instance';
import { resolvePowerDirectorRoot } from '../../../../lib/paths';

const SUPPORTED_CHANNELS = [
    'discord', 'slack', 'telegram', 'whatsapp', 'matrix', 'signal',
    'twitter', 'linkedin', 'email', 'bluebubbles', 'imessage', 'nextcloud-talk',
    'webchat', 'msteams', 'googlechat', 'nostr', 'line', 'twitch',
    'tlon', 'zalo', 'zalouser'
];

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
    twitch: 'Twitch',
    tlon: 'Tlon',
    zalo: 'Zalo',
    zalouser: 'Zalo Personal'
};

const CHANNEL_CONFIG_ALIASES: Record<string, string[]> = {
    msteams: ['teams', 'msTeams', 'microsoftTeams'],
    googlechat: ['googleChat', 'google-chat', 'gchat'],
    'nextcloud-talk': ['nextcloudTalk', 'nextcloudtalk'],
    bluebubbles: ['blueBubbles'],
    imessage: ['iMessage'],
    webchat: ['webChat']
};

function asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : {};
}

function isLiveConnected(live: any): boolean {
    return Boolean(
        live?.status === 'Active'
        || live?.health?.connected
        || live?.probe?.ok
    );
}

function normalizeChannelId(id: string): string {
    const raw = String(id || '').trim();
    const lowered = raw.toLowerCase();
    if (!lowered) return '';
    if (lowered === 'teams' || lowered === 'msteams') return 'msteams';
    if (lowered === 'googlechat' || lowered === 'google-chat' || lowered === 'gchat') return 'googlechat';
    if (lowered === 'nextcloudtalk' || lowered === 'nextcloud-talk') return 'nextcloud-talk';
    if (lowered.startsWith('nextcloud-')) return 'nextcloud-talk';
    if (lowered.startsWith('bluebubbles-')) return 'bluebubbles';
    if (lowered.startsWith('nostr-')) return 'nostr';
    return lowered;
}

function resolveConfiguredChannel(
    configuredChannels: Record<string, any>,
    channelId: string
): { key?: string; config: Record<string, any> } {
    const candidates = [channelId, ...(CHANNEL_CONFIG_ALIASES[channelId] || [])];
    for (const candidate of candidates) {
        if (Object.prototype.hasOwnProperty.call(configuredChannels, candidate)) {
            return { key: candidate, config: asRecord(configuredChannels[candidate]) };
        }
    }

    const loweredCandidates = new Set(candidates.map((candidate) => candidate.toLowerCase()));
    for (const [key, value] of Object.entries(configuredChannels)) {
        if (loweredCandidates.has(key.toLowerCase())) {
            return { key, config: asRecord(value) };
        }
    }

    return { config: {} };
}

function isConfigured(config: any): boolean {
    if (!config || typeof config !== 'object') return false;
    const entries = Object.entries(config);
    return entries.some(([key, value]) => {
        if (key === 'enabled') return false;
        if (value == null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (typeof value === 'number' || typeof value === 'boolean') return true;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return false;
    });
}

function resolveDefaultAccountId(config: Record<string, any>, fallback: string): string {
    const accounts = asRecord(config.accounts);
    const ids = Object.keys(accounts).filter((id) => id.trim().length > 0);
    const explicit = typeof config.defaultAccount === 'string' ? config.defaultAccount.trim() : '';
    if (explicit && Object.prototype.hasOwnProperty.call(accounts, explicit)) {
        return explicit;
    }
    if (explicit && ids.length > 0) {
        const matched = ids.find((id) => id.toLowerCase() === explicit.toLowerCase());
        if (matched) return matched;
    }
    if (ids.length > 0) return ids[0];
    return fallback;
}

export async function GET(request: Request) {
    try {
        console.log('[API] /api/channels/status: GET request received');
        const service = getService();
        const gateway = service.gateway;

        const { searchParams } = new URL(request.url);
        const probeParam = searchParams.get('probe') === 'true';
        const channelFilter = (searchParams.get('channel') || '').trim().toLowerCase();
        const accountId = searchParams.get('accountId');

        console.log(`[API] Fetching from embedded gateway instance`);

        let liveChannels: any[] = [];
        if (gateway) {
            liveChannels = await Promise.all(Array.from(gateway.channels.values()).map(async (c) => {
                let probeResult: { ok: boolean; error?: string } = { ok: true };
                const shouldProbe = probeParam && (!channelFilter || c.id.toLowerCase() === channelFilter);
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
                    enabled: true,
                    status: status.connected ? 'Active' : 'Error',
                    config: {},
                    lastError: status.error,
                    health: { connected: status.connected, running: status.running },
                    probe: shouldProbe ? probeResult : undefined
                };
            }));

            if (channelFilter) {
                liveChannels = liveChannels.filter(c => String(c.id || '').toLowerCase() === channelFilter);
            }
            console.log(`[API] Retrieved ${liveChannels.length} channels directly from Gateway instance`);
        } else {
            console.warn('[API] Embedded gateway instance is not available');
        }

        let fullConfig: any = {};
        try {
            const rootDir = resolvePowerDirectorRoot();
            const configPath = path.join(rootDir, 'powerdirector.config.json');
            if (fs.existsSync(configPath)) {
                fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } else {
                const homedir = process.env.HOME || os.homedir();
                const homeConfigPath = path.join(homedir, '.powerdirector', 'powerdirector.json');
                if (fs.existsSync(homeConfigPath)) {
                    fullConfig = JSON.parse(fs.readFileSync(homeConfigPath, 'utf8'));
                }
            }
        } catch (err) {
            console.warn('Failed to read config for channel parsing', err);
        }
        const liveById = new Map<string, any[]>();
        for (const entry of liveChannels) {
            const normalized = normalizeChannelId(String(entry?.id || ''));
            if (!normalized) continue;
            const bucket = liveById.get(normalized) || [];
            bucket.push(entry);
            liveById.set(normalized, bucket);
        }

        const configuredChannels = asRecord(fullConfig?.channels);
        const configuredIds = Object.keys(configuredChannels).map((id) => normalizeChannelId(id)).filter(Boolean);
        const liveIds = Array.from(liveById.keys()).filter(Boolean);
        const orderedIds = Array.from(new Set([...liveIds, ...configuredIds, ...SUPPORTED_CHANNELS])).filter(Boolean);
        const requestedChannelId = typeof channel === 'string' ? normalizeChannelId(channel) : '';

        const channelAccounts: Record<string, any[]> = {};
        const channelDefaultAccountId: Record<string, string> = {};
        const mergedChannels = orderedIds.map((id) => {
            const liveEntries = liveById.get(id) || [];
            const primaryLive = liveEntries[0];
            const { config } = resolveConfiguredChannel(configuredChannels, id);
            const accountsConfig = asRecord(config.accounts);
            const configuredAccountIds = Object.keys(accountsConfig).filter((accountId) => accountId.trim().length > 0);
            const fallbackAccountId = String(primaryLive?.id || id);
            const defaultAccountId = resolveDefaultAccountId(config, fallbackAccountId);
            const derivedLiveAccountIds = configuredAccountIds.length === 0
                ? liveEntries
                    .map((entry) => String(entry?.id || '').trim())
                    .filter((accountId) => accountId.length > 0)
                : [];
            const accountIds = Array.from(
                new Set([
                    ...configuredAccountIds,
                    ...derivedLiveAccountIds,
                    defaultAccountId
                ])
            ).filter((accountId) => accountId.trim().length > 0);

            const accounts = accountIds.map((accountId) => {
                const accountConfig = asRecord(accountsConfig[accountId]);
                const mergedConfig = { ...config, ...accountConfig };
                delete mergedConfig.accounts;
                delete mergedConfig.defaultAccount;

                const matchingLive = liveEntries.find((entry) => String(entry?.id || '') === accountId)
                    || (accountId === defaultAccountId ? primaryLive : undefined);
                const liveConnected = isLiveConnected(matchingLive);
                const enabled = typeof mergedConfig.enabled === 'boolean'
                    ? mergedConfig.enabled
                    : Boolean(matchingLive);
                const configured = isConfigured(mergedConfig);

                return {
                    accountId,
                    name: accountConfig.name || (accountId === defaultAccountId
                        ? (primaryLive?.name || CHANNEL_LABELS[id] || id)
                        : accountId),
                    enabled,
                    configured,
                    connected: liveConnected,
                    running: liveConnected,
                    lastError: matchingLive?.lastError,
                    probe: matchingLive?.probe
                };
            });

            channelAccounts[id] = accounts;
            channelDefaultAccountId[id] = defaultAccountId;

            const defaultAccount = accounts.find((account) => account.accountId === defaultAccountId) || accounts[0] || {
                accountId: defaultAccountId,
                enabled: false,
                configured: false,
                connected: false,
                running: false
            };
            const channelEnabled = accounts.some((account) => account.enabled);
            const channelConfigured = accounts.some((account) => account.configured);
            const channelConnected = accounts.some((account) => account.connected);

            return {
                id,
                name: primaryLive?.name || CHANNEL_LABELS[id] || id,
                enabled: channelEnabled,
                configured: channelConfigured,
                status: channelConnected ? 'Active' : (channelEnabled ? 'Idle' : 'Disabled'),
                health: primaryLive?.health,
                probe: defaultAccount.probe,
                lastError: defaultAccount.lastError,
                config
            };
        });

        const visibleChannels = requestedChannelId
            ? mergedChannels.filter((entry) => entry.id === requestedChannelId)
            : mergedChannels;
        const visibleChannelIds = new Set(visibleChannels.map((entry) => entry.id));
        const visibleChannelAccounts = Object.fromEntries(
            Object.entries(channelAccounts).filter(([channelId]) => visibleChannelIds.has(channelId))
        );
        const visibleDefaultAccountIds = Object.fromEntries(
            Object.entries(channelDefaultAccountId).filter(([channelId]) => visibleChannelIds.has(channelId))
        );

        const now = Date.now();
        const channelOrder = visibleChannels.map((entry) => entry.id);
        const channelLabels = Object.fromEntries(
            visibleChannels.map((entry) => [entry.id, entry.name || CHANNEL_LABELS[entry.id] || entry.id])
        );
        const channels = Object.fromEntries(
            visibleChannels.map((entry) => {
                const defaultAccountId = visibleDefaultAccountIds[entry.id];
                const defaultAccount = (visibleChannelAccounts[entry.id] || []).find((account) => account.accountId === defaultAccountId)
                    || (visibleChannelAccounts[entry.id] || [])[0]
                    || { accountId: defaultAccountId };
                return [entry.id, defaultAccount];
            })
        );

        return NextResponse.json({
            channels: visibleChannels,
            ts: now,
            channelOrder,
            channelLabels,
            channelsById: channels,
            channelAccounts: visibleChannelAccounts,
            channelDefaultAccountId: visibleDefaultAccountIds,
            channelsSnapshot: {
                ts: now,
                channelOrder,
                channelLabels,
                channels,
                channelAccounts: visibleChannelAccounts,
                channelDefaultAccountId: visibleDefaultAccountIds
            }
        });
    } catch (e: any) {
        console.error('Failed to fetch channel status from Gateway', e.message);
        return NextResponse.json({
            channels: [],
            error: 'Gateway unreachable or error. Check server logs.'
        }, { status: 502 });
    }
}
