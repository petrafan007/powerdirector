'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Settings } from 'lucide-react';

type ChannelProbe = {
    ok?: boolean;
    error?: string;
    status?: string;
};

type ChannelAccountSnapshot = {
    accountId: string;
    name?: string | null;
    enabled?: boolean | null;
    configured?: boolean | null;
    running?: boolean | null;
    connected?: boolean | null;
    lastInboundAt?: number | null;
    lastError?: string | null;
    probe?: ChannelProbe | null;
};

type ChannelSnapshot = {
    id: string;
    name: string;
    enabled: boolean;
    configured?: boolean;
    status?: string;
    lastError?: string;
    probe?: ChannelProbe;
};

type ChannelsStatusResponse = {
    channels: ChannelSnapshot[];
    ts?: number;
    channelOrder?: string[];
    channelLabels?: Record<string, string>;
    channelAccounts?: Record<string, ChannelAccountSnapshot[]>;
    channelDefaultAccountId?: Record<string, string>;
    error?: string;
};

function formatRelativeTime(ts?: number | null): string {
    if (!ts || !Number.isFinite(ts)) return 'n/a';
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

function deriveConnected(account: ChannelAccountSnapshot): boolean {
    if (account.connected === true) return true;
    if (account.running === true) return true;
    if (account.probe?.ok === true) return true;
    return false;
}

function sortChannels(channels: ChannelSnapshot[]): ChannelSnapshot[] {
    return [...channels].sort((a, b) => {
        const aEnabled = Boolean(a.enabled || a.configured);
        const bEnabled = Boolean(b.enabled || b.configured);
        if (aEnabled !== bEnabled) {
            return aEnabled ? -1 : 1;
        }
        return a.id.localeCompare(b.id);
    });
}

export default function ChannelsPage() {
    const [snapshot, setSnapshot] = useState<ChannelsStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [probing, setProbing] = useState(false);
    const [loggingOut, setLoggingOut] = useState<string | null>(null);

    const loadChannels = async (probe: boolean, channelId?: string) => {
        if (probe) setProbing(true);
        else setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (probe) params.set('probe', 'true');
            if (typeof channelId === 'string' && channelId.trim().length > 0) {
                params.set('channel', channelId.trim());
            }
            const url = params.toString()
                ? `/api/channels/status?${params.toString()}`
                : '/api/channels/status';
            const response = await fetch(url, { cache: 'no-store' });
            const data: ChannelsStatusResponse = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || `Failed to load channels (${response.status})`);
            }
            setSnapshot(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load channels.');
            setSnapshot({
                channels: [],
                channelAccounts: {},
                channelDefaultAccountId: {},
                channelLabels: {},
                channelOrder: []
            });
        } finally {
            setLoading(false);
            setProbing(false);
        }
    };

    useEffect(() => {
        void loadChannels(false);
    }, []);

    const channels = useMemo(
        () => sortChannels(snapshot?.channels ?? []),
        [snapshot]
    );

    const handleLogout = async (channelId: string) => {
        setLoggingOut(channelId);
        try {
            const response = await fetch('/api/channels/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data?.error) {
                throw new Error(data?.error || `Failed to logout channel ${channelId}`);
            }
            await loadChannels(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to logout channel.');
        } finally {
            setLoggingOut(null);
        }
    };

    if (loading && !snapshot) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--pd-text-main)] mb-1">Channels</h1>
                    <p className="text-[13px] text-[var(--pd-text-muted)]">Channel status snapshots from the gateway runtime.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void loadChannels(true)}
                        disabled={probing}
                        className="text-sm px-3 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded transition-colors flex items-center gap-2 disabled:opacity-60"
                    >
                        <RefreshCw size={14} className={probing ? 'animate-spin' : ''} />
                        <span>{probing ? 'Probing...' : 'Probe'}</span>
                    </button>
                    <Link href="/config/channels" className="text-sm px-3 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded transition-colors flex items-center gap-2">
                        <Settings size={14} />
                        <span>Advanced Config</span>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {channels.length === 0 && (
                    <div className="rounded-md border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-4 text-[13px] text-[var(--pd-text-muted)]">
                        No channels found.
                    </div>
                )}

                {channels.map((channel) => {
                    const accounts = snapshot?.channelAccounts?.[channel.id] ?? [];
                    const connectedCount = accounts.filter((account) => deriveConnected(account)).length;
                    const configuredCount = accounts.filter((account) => account.configured).length;
                    const enabledCount = accounts.filter((account) => account.enabled).length;
                    const accountSummary = accounts.length > 0
                        ? `${connectedCount}/${accounts.length} connected • ${configuredCount} configured • ${enabledCount} enabled`
                        : 'No accounts';

                    return (
                        <section key={channel.id} className="rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">{channel.name || channel.id}</h2>
                                    <p className="text-[12px] text-[var(--pd-text-muted)] font-mono">{channel.id}</p>
                                </div>
                                <div className="text-right text-[12px] text-[var(--pd-text-muted)]">
                                    <div>{channel.status || (channel.enabled ? 'Active' : 'Idle')}</div>
                                    <div>{accountSummary}</div>
                                </div>
                            </div>

                            {accounts.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                    {accounts.map((account) => (
                                        <div key={`${channel.id}:${account.accountId}`} className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)]/40 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-medium text-[var(--pd-text-main)]">{account.name || account.accountId}</div>
                                                    <div className="text-[11px] text-[var(--pd-text-muted)] font-mono">{account.accountId}</div>
                                                </div>
                                                <div className="text-right text-[11px] text-[var(--pd-text-muted)]">
                                                    <div>Running: {account.running ? 'Yes' : 'No'}</div>
                                                    <div>Connected: {deriveConnected(account) ? 'Yes' : 'No'}</div>
                                                    <div>Inbound: {formatRelativeTime(account.lastInboundAt)}</div>
                                                </div>
                                            </div>
                                            {account.lastError && (
                                                <div className="mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-300">
                                                    {account.lastError}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-3 text-[13px] text-[var(--pd-text-muted)]">
                                    No account snapshots available.
                                </div>
                            )}

                            {channel.lastError && (
                                <div className="mt-3 rounded border border-red-500/30 bg-red-500/10 p-2 text-[12px] text-red-300">
                                    {channel.lastError}
                                </div>
                            )}

                            <div className="mt-3 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => void loadChannels(true, channel.id)}
                                    disabled={probing}
                                    className="text-xs px-2.5 py-1.5 border border-[var(--pd-border)] rounded bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] disabled:opacity-60"
                                >
                                    Probe
                                </button>
                                <button
                                    onClick={() => void handleLogout(channel.id)}
                                    disabled={loggingOut === channel.id}
                                    className="text-xs px-2.5 py-1.5 border border-[var(--pd-border)] rounded bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] disabled:opacity-60"
                                >
                                    {loggingOut === channel.id ? 'Logging out...' : 'Logout'}
                                </button>
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
