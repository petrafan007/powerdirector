'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '../config/SettingsContext';

function formatDurationHuman(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

function formatRelativeTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

export default function OverviewPage() {
    const { config, gatewayStatus, gatewayMode, setGatewayMode, configureGateway } = useSettings();
    const [data, setData] = useState<any>(null);
    const [gatewayUrl, setGatewayUrl] = useState('');
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [sessionKey, setSessionKey] = useState('agent:main:main');

    useEffect(() => {
        // Load initial values from config if available or local storage default
        // We use the same defaults as SettingsContext to keep UI in sync
        const savedUrl = localStorage.getItem('pd_gateway_url');
        const savedToken = localStorage.getItem('pd_gateway_token');

        if (savedUrl) setGatewayUrl(savedUrl);
        else if (config?.gateway?.url) setGatewayUrl(config.gateway.url);

        if (savedToken) setToken(savedToken);
        else if (config?.gateway?.auth?.token) setToken(config.gateway.auth.token);

        // Fetch stats
        fetch('/api/overview')
            .then(res => res.json())
            .then(setData)
            .catch(console.error);
    }, [config]);

    const handleConnect = () => {
        if (gatewayMode === 'local') {
            // Switching to Remote
            if (!gatewayUrl) {
                alert('Please enter a WebSocket URL');
                return;
            }
            configureGateway(gatewayUrl, token);
            setGatewayMode('remote');
        } else {
            // Refresh connection
            configureGateway(gatewayUrl, token);
        }
    };

    const handleSwitchToLocal = () => {
        setGatewayMode('local');
    };

    if (!data) return <div className="p-8">Loading...</div>;

    const uptime = data.hello?.snapshot?.uptimeMs ? formatDurationHuman(data.hello.snapshot.uptimeMs) : 'n/a';
    const tick = data.hello?.snapshot?.policy?.tickIntervalMs ? `${data.hello.snapshot.policy.tickIntervalMs}ms` : 'n/a';

    const isLocal = gatewayMode === 'local';

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="mb-2">
                <h1 className="text-2xl font-semibold text-[var(--pd-text-main)] mb-1">Overview</h1>
                <p className="text-[13px] text-[var(--pd-text-muted)]">Gateway status, entry points, and a fast health read.</p>
            </div>

            {/* Top Row: Gateway Access & Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Gateway Access Card */}
                <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)] leading-snug">Gateway Access</h2>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${gatewayStatus === 'connected' ? 'bg-green-500' : gatewayStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--pd-text-muted)]">{gatewayStatus}</span>
                        </div>
                    </div>
                    <p className="text-[13px] text-[var(--pd-text-muted)] mb-5 leading-normal">
                        Current Mode: <strong className="text-[var(--pd-text-main)]">{isLocal ? 'Local (Monolith)' : 'Remote (WebSocket)'}</strong>
                    </p>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 ${isLocal ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">WebSocket URL</label>
                            <input
                                className="w-full px-3 py-2 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded text-sm focus:border-[var(--pd-accent)] outline-none transition-colors"
                                placeholder="wss://..."
                                value={gatewayUrl}
                                onChange={e => setGatewayUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">Gateway Token</label>
                            <input
                                className="w-full px-3 py-2 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded text-sm focus:border-[var(--pd-accent)] outline-none transition-colors"
                                placeholder="POWERDIRECTOR_GATEWAY_TOKEN"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">Password (not stored)</label>
                            <input
                                type="password"
                                className="w-full px-3 py-2 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded text-sm focus:border-[var(--pd-accent)] outline-none transition-colors"
                                placeholder="system or shared password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">Default Session Key</label>
                            <input
                                className="w-full px-3 py-2 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded text-sm focus:border-[var(--pd-accent)] outline-none transition-colors"
                                value={sessionKey}
                                onChange={e => setSessionKey(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-2">
                        {isLocal ? (
                            <button onClick={handleConnect} className="px-4 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px] font-medium transition-all shadow-sm">
                                Switch to Remote
                            </button>
                        ) : (
                            <>
                                <button onClick={handleConnect} className="px-4 py-1.5 bg-[var(--pd-accent)] text-white hover:opacity-90 border border-transparent rounded text-[13px] font-medium transition-all shadow-sm">
                                    {gatewayStatus === 'connected' ? 'Save & Reconnect' : 'Connect'}
                                </button>
                                <button onClick={handleSwitchToLocal} className="px-4 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px] font-medium transition-all shadow-sm">
                                    Switch to Local
                                </button>
                            </>
                        )}
                        <span className="text-[12px] text-[var(--pd-text-muted)] ml-auto">
                            {isLocal ? 'Using internal agent.' : 'Connecting to external PowerDirector gateway.'}
                        </span>
                    </div>
                </div>

                {/* Snapshot Card */}
                <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                    <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)] mb-1 leading-snug">Snapshot</h2>
                    <p className="text-[13px] text-[var(--pd-text-muted)] mb-5 leading-normal">Latest gateway handshake information.</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-3 bg-[var(--pd-surface-sidebar)]/50 rounded border border-[var(--pd-border)]/50">
                            <div className="text-[10px] uppercase tracking-wide text-[var(--pd-text-muted)] font-bold mb-1">Status</div>
                            <div className="text-[15px] font-medium text-green-500">{data.connected ? "Connected" : "Disconnected"}</div>
                        </div>
                        <div className="p-3 bg-[var(--pd-surface-sidebar)]/50 rounded border border-[var(--pd-border)]/50">
                            <div className="text-[10px] uppercase tracking-wide text-[var(--pd-text-muted)] font-bold mb-1">Uptime</div>
                            <div className="text-[15px] font-medium">{uptime}</div>
                        </div>
                        <div className="p-3 bg-[var(--pd-surface-sidebar)]/50 rounded border border-[var(--pd-border)]/50">
                            <div className="text-[10px] uppercase tracking-wide text-[var(--pd-text-muted)] font-bold mb-1">Tick Interval</div>
                            <div className="text-[15px] font-medium">{tick}</div>
                        </div>
                        <div className="p-3 bg-[var(--pd-surface-sidebar)]/50 rounded border border-[var(--pd-border)]/50">
                            <div className="text-[10px] uppercase tracking-wide text-[var(--pd-text-muted)] font-bold mb-1">Last Channels Refresh</div>
                            <div className="text-[15px] font-medium">{data.lastChannelsRefresh ? formatRelativeTime(data.lastChannelsRefresh) : "n/a"}</div>
                        </div>
                    </div>

                    <div className="mt-4 p-3.5 bg-[var(--pd-surface-sidebar)] rounded-md border border-[var(--pd-border)] text-[13px] text-[var(--pd-text-muted)]">
                        Use Channels to link WhatsApp, Telegram, Discord, Signal, or iMessage.
                    </div>
                </div>
            </div>

            {/* Middle Row: Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--pd-text-muted)] mb-1">Instances</div>
                    <div className="text-3xl font-semibold mb-1">{data.presenceCount}</div>
                    <div className="text-[13px] text-[var(--pd-text-muted)]">Presence beacons in the last 5 minutes.</div>
                </div>
                <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--pd-text-muted)] mb-1">Sessions</div>
                    <div className="text-3xl font-semibold mb-1">{data.sessionsCount ?? "n/a"}</div>
                    <div className="text-[13px] text-[var(--pd-text-muted)]">Recent session keys tracked by the gateway.</div>
                </div>
                <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--pd-text-muted)] mb-1">Cron</div>
                    <div className="text-3xl font-semibold mb-1">{data.cronEnabled ? "Enabled" : "Disabled"}</div>
                    <div className="text-[13px] text-[var(--pd-text-muted)]">Next wake n/a</div>
                </div>
            </div>

            {/* Bottom Row: Notes */}
            <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)] mb-1 leading-snug">Notes</h2>
                <p className="text-[13px] text-[var(--pd-text-muted)] mb-5 leading-normal">Quick reminders for remote control setups.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <div className="text-[14px] font-medium mb-1">Tailscale serve</div>
                        <div className="text-[13px] text-[var(--pd-text-muted)] leading-relaxed">Prefer serve mode to keep the gateway on loopback with tailnet auth.</div>
                    </div>
                    <div>
                        <div className="text-[14px] font-medium mb-1">Session hygiene</div>
                        <div className="text-[13px] text-[var(--pd-text-muted)] leading-relaxed">Use /new or sessions.patch to reset context.</div>
                    </div>
                    <div>
                        <div className="text-[14px] font-medium mb-1">Cron reminders</div>
                        <div className="text-[13px] text-[var(--pd-text-muted)] leading-relaxed">Use isolated sessions for recurring runs.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
