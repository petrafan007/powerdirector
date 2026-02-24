'use client';

import { useState, useEffect } from 'react';

interface InstanceEntry {
    id: string;
    instanceId: string | null;
    host: string | null;
    ip: string | null;
    mode: string | null;
    platform: string | null;
    deviceFamily: string | null;
    modelIdentifier: string | null;
    version: string | null;
    roles: string[];
    scopes: string[];
    lastInputSeconds: number | null;
    reason: string | null;
    seenAt: number;
    text: string | null;
}

function formatRelativeTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

export default function InstancesPage() {
    const [entries, setEntries] = useState<InstanceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastError, setLastError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const formatPresenceSummary = (entry: InstanceEntry): string => {
        const host = entry.host ?? 'unknown';
        const ip = entry.ip ? `(${entry.ip})` : '';
        const mode = entry.mode ?? '';
        const version = entry.version ?? '';
        return `${host} ${ip} ${mode} ${version}`.trim();
    };

    const fetchInstances = () => {
        setLoading(true);
        setLastError(null);
        setStatusMessage(null);
        fetch('/api/instances')
            .then(res => res.json())
            .then(data => {
                setEntries(data.entries || []);
                setLastError(typeof data.lastError === 'string' ? data.lastError : null);
                setStatusMessage(typeof data.statusMessage === 'string' ? data.statusMessage : null);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLastError(err instanceof Error ? err.message : 'Failed to load instances.');
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-[var(--pd-text-main)] mb-1">Instances</h1>
                <p className="text-[13px] text-[var(--pd-text-muted)]">Presence beacons from connected clients and nodes.</p>
            </div>

            <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)] mb-1 leading-snug">Connected Instances</h2>
                        <p className="text-[13px] text-[var(--pd-text-muted)] leading-normal">Presence beacons from the gateway and clients.</p>
                    </div>
                    <button
                        onClick={fetchInstances}
                        disabled={loading}
                        className="px-4 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px] font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                <div className="space-y-4">
                    {lastError && (
                        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">
                            {lastError}
                        </div>
                    )}

                    {statusMessage && (
                        <div className="rounded-md border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)]/50 p-3 text-[13px] text-[var(--pd-text-muted)]">
                            {statusMessage}
                        </div>
                    )}

                    {entries.length === 0 && !loading && (
                        <div className="text-[13px] text-[var(--pd-text-muted)]">No instances reported yet.</div>
                    )}

                    {entries.map(entry => (
                        <div key={entry.id} className="flex justify-between items-start py-4 border-b border-[var(--pd-border)] last:border-0 border-opacity-50">
                            <div>
                                <div className="text-[14px] font-semibold text-[var(--pd-text-main)] mb-0.5">
                                    {entry.host ?? entry.instanceId ?? 'unknown host'}
                                </div>
                                <div className="text-[13px] text-[var(--pd-text-muted)] mb-2">
                                    {formatPresenceSummary(entry)}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {/* Chips */}
                                    {entry.mode && (
                                        <span className="px-2 py-0.5 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded-full text-[11px] font-medium text-[var(--pd-text-muted)]">
                                            {entry.mode}
                                        </span>
                                    )}
                                    {entry.roles?.map((role) => (
                                        <span key={`role-${entry.id}-${role}`} className="px-2 py-0.5 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded-full text-[11px] font-medium text-[var(--pd-text-muted)]">
                                            {role}
                                        </span>
                                    ))}
                                    {entry.scopes?.length > 0 && (
                                        <span className="px-2 py-0.5 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded-full text-[11px] font-medium text-[var(--pd-text-muted)]">
                                            {entry.scopes.length > 3 ? `${entry.scopes.length} scopes` : `scopes: ${entry.scopes.join(', ')}`}
                                        </span>
                                    )}
                                    {entry.platform && (
                                        <span className="px-2 py-0.5 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded-full text-[11px] font-medium text-[var(--pd-text-muted)]">
                                            {entry.platform}
                                        </span>
                                    )}
                                    {entry.deviceFamily && (
                                        <span className="px-2 py-0.5 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded-full text-[11px] font-medium text-[var(--pd-text-muted)]">
                                            {entry.deviceFamily}
                                        </span>
                                    )}
                                    {entry.modelIdentifier && (
                                        <span className="px-2 py-0.5 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded-full text-[11px] font-medium text-[var(--pd-text-muted)]">
                                            {entry.modelIdentifier}
                                        </span>
                                    )}
                                    {entry.version && (
                                        <span className="px-2 py-0.5 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded-full text-[11px] font-medium text-[var(--pd-text-muted)]">
                                            {entry.version}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right text-[12px] text-[var(--pd-text-muted)] space-y-0.5 min-w-[100px]">
                                <div>{formatRelativeTime(entry.seenAt)}</div>
                                <div>Last Input {entry.lastInputSeconds != null ? `${entry.lastInputSeconds}s ago` : 'n/a'}</div>
                                <div>Reason {entry.reason ?? 'n/a'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
