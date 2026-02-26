'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type GatewaySessionRow = {
    key: string;
    label?: string;
    displayName?: string;
    kind: 'direct' | 'group' | 'global' | 'unknown';
    updatedAt: number | null;
    totalTokens?: number | null;
    contextTokens?: number | null;
    thinkingLevel?: string | null;
    verboseLevel?: string | null;
    reasoningLevel?: string | null;
    modelProvider?: string | null;
    model?: string | null;
};

type SessionsListResult = {
    path: string;
    count: number;
    sessions: GatewaySessionRow[];
};

function formatRelativeTime(ts: number | null): string {
    if (!ts) return 'n/a';
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatTokens(row: GatewaySessionRow): string {
    if (row.totalTokens == null) return 'n/a';
    const total = row.totalTokens ?? 0;
    const context = row.contextTokens ?? 0;
    return context ? `${total} / ${context}` : String(total);
}

export default function SessionsPage() {
    const [result, setResult] = useState<SessionsListResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeMinutes, setActiveMinutes] = useState('');
    const [limit, setLimit] = useState('120');
    const [includeGlobal, setIncludeGlobal] = useState(true);
    const [includeUnknown, setIncludeUnknown] = useState(false);

    const fetchSessions = () => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (activeMinutes.trim()) params.set('activeMinutes', activeMinutes.trim());
        if (limit.trim()) params.set('limit', limit.trim());
        if (includeGlobal) params.set('includeGlobal', 'true');
        if (includeUnknown) params.set('includeUnknown', 'true');

        fetch(`/api/agent/sessions?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setError(data.error);
                }
                setResult({
                    path: typeof data.path === 'string' ? data.path : '',
                    count: Number.isFinite(data.count)
                        ? data.count
                        : (Array.isArray(data.sessions) ? data.sessions.length : 0),
                    sessions: Array.isArray(data.sessions) ? data.sessions : []
                });
                setLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load sessions.');
                setResult({ path: '', count: 0, sessions: [] });
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading && !result) return <div className="p-6">Loading...</div>;

    const rows = result?.sessions ?? [];

    return (
        <div className="p-6">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--pd-text-main)] mb-1">Sessions</h1>
                    <p className="text-[13px] text-[var(--pd-text-muted)]">Active session keys and per-session metadata.</p>
                </div>
                <Link href="/config/session" className="text-sm px-3 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded transition-colors">
                    Configure Policies
                </Link>
            </div>

            <div className="rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-4">
                <div className="mb-4 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-[var(--pd-text-muted)]">
                        <span>Active Within (Minutes)</span>
                        <input
                            value={activeMinutes}
                            onChange={(e) => setActiveMinutes(e.target.value)}
                            className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] px-3 py-2 text-sm text-[var(--pd-text-main)] outline-none"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[var(--pd-text-muted)]">
                        <span>Limit</span>
                        <input
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] px-3 py-2 text-sm text-[var(--pd-text-main)] outline-none"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[var(--pd-text-main)]">
                        <input type="checkbox" checked={includeGlobal} onChange={(e) => setIncludeGlobal(e.target.checked)} />
                        Include Global
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[var(--pd-text-main)]">
                        <input type="checkbox" checked={includeUnknown} onChange={(e) => setIncludeUnknown(e.target.checked)} />
                        Include Unknown
                    </label>
                    <button
                        onClick={fetchSessions}
                        disabled={loading}
                        className="ml-auto rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] px-3 py-2 text-sm hover:bg-[var(--pd-button-hover)] disabled:opacity-60"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {error && (
                    <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">
                        {error}
                    </div>
                )}

                <div className="mb-3 text-xs text-[var(--pd-text-muted)]">
                    {result ? `Store: ${result.path} • ${result.count} session(s)` : 'Store: n/a'}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-[var(--pd-border)] text-xs uppercase opacity-60">
                                <th className="py-2 px-4">Key</th>
                                <th className="py-2 px-4">Label</th>
                                <th className="py-2 px-4">Kind</th>
                                <th className="py-2 px-4">Updated</th>
                                <th className="py-2 px-4">Tokens</th>
                                <th className="py-2 px-4">Thinking</th>
                                <th className="py-2 px-4">Verbose</th>
                                <th className="py-2 px-4">Reasoning</th>
                                <th className="py-2 px-4">Model</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center opacity-50">No sessions found.</td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr key={row.key} className="border-b border-[var(--pd-border)] hover:bg-[var(--pd-surface-sidebar)] transition-colors">
                                        <td className="py-3 px-4 font-mono text-xs">{row.key}</td>
                                        <td className="py-3 px-4">{row.label || row.displayName || '-'}</td>
                                        <td className="py-3 px-4">{row.kind}</td>
                                        <td className="py-3 px-4 opacity-70">{formatRelativeTime(row.updatedAt)}</td>
                                        <td className="py-3 px-4">{formatTokens(row)}</td>
                                        <td className="py-3 px-4">{row.thinkingLevel || 'inherit'}</td>
                                        <td className="py-3 px-4">{row.verboseLevel || 'inherit'}</td>
                                        <td className="py-3 px-4">{row.reasoningLevel || 'inherit'}</td>
                                        <td className="py-3 px-4 font-mono text-xs">{row.modelProvider && row.model ? `${row.modelProvider}/${row.model}` : 'n/a'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
