'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';

type DailyUsage = {
    date: string;
    totalTokens: number;
    totalCost: number;
};

type SessionUsage = {
    key: string;
    label: string;
    agentId: string;
    model: string;
    updatedAt: number;
    usage: {
        totalTokens: number;
        totalCost: number;
        messageCounts: {
            total: number;
            errors: number;
        };
    };
};

type UsageStats = {
    totalTokens: number;
    hourTotals: number[];
    weekdayTotals: Array<{ label: string; tokens: number }>;
    hasData: boolean;
};

type UsagePayload = {
    daily: DailyUsage[];
    sessions: SessionUsage[];
    stats: UsageStats;
};

type SortMode = 'recent' | 'tokens' | 'cost';

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function formatCost(n: number): string {
    return `$${n.toFixed(2)}`;
}

function toDateInputValue(value: Date): string {
    return value.toISOString().split('T')[0];
}

function toSessionCsv(sessions: SessionUsage[]): string {
    const esc = (value: string): string => `"${value.replaceAll('"', '""')}"`;
    const header = [
        'session_key',
        'label',
        'agent_id',
        'model',
        'updated_at',
        'total_tokens',
        'total_cost',
        'messages_total',
        'messages_errors'
    ].join(',');
    const rows = sessions.map((session) =>
        [
            esc(session.key),
            esc(session.label || ''),
            esc(session.agentId || ''),
            esc(session.model || ''),
            esc(new Date(session.updatedAt).toISOString()),
            String(session.usage.totalTokens ?? 0),
            String(session.usage.totalCost ?? 0),
            String(session.usage.messageCounts.total ?? 0),
            String(session.usage.messageCounts.errors ?? 0)
        ].join(',')
    );
    return [header, ...rows].join('\n');
}

function downloadText(content: string, fileName: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

export default function UsagePage() {
    const [dateRange, setDateRange] = useState<'Today' | '7d' | '30d'>('7d');
    const [startDate, setStartDate] = useState(toDateInputValue(new Date(Date.now() - 7 * 86400000)));
    const [endDate, setEndDate] = useState(toDateInputValue(new Date()));
    const [chartMode, setChartMode] = useState<'tokens' | 'cost'>('tokens');
    const [sortBy, setSortBy] = useState<SortMode>('recent');
    const [query, setQuery] = useState('');
    const [data, setData] = useState<UsagePayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ startDate, endDate });
            const response = await fetch(`/api/usage?${params}`, { cache: 'no-store' });
            const payload = (await response.json().catch(() => null)) as UsagePayload | null;
            if (!response.ok || !payload) {
                throw new Error(`Failed to load usage (${response.status})`);
            }
            setData(payload);
        } catch (fetchError: unknown) {
            const message = fetchError instanceof Error ? fetchError.message : 'Failed to load usage';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [endDate, startDate]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const filteredSessions = useMemo(() => {
        const sessions = data?.sessions || [];
        const needle = query.trim().toLowerCase();
        const subset = needle.length === 0
            ? sessions
            : sessions.filter((session) =>
                [
                    session.key,
                    session.label,
                    session.agentId,
                    session.model,
                    String(session.usage.totalTokens),
                    String(session.usage.totalCost)
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(needle)
            );

        return [...subset].sort((a, b) => {
            if (sortBy === 'tokens') return (b.usage.totalTokens ?? 0) - (a.usage.totalTokens ?? 0);
            if (sortBy === 'cost') return (b.usage.totalCost ?? 0) - (a.usage.totalCost ?? 0);
            return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
        });
    }, [data?.sessions, query, sortBy]);

    const sessionTotals = useMemo(() => {
        return filteredSessions.reduce(
            (acc, session) => {
                acc.tokens += session.usage.totalTokens ?? 0;
                acc.errors += session.usage.messageCounts.errors ?? 0;
                acc.sessions += 1;
                return acc;
            },
            { tokens: 0, errors: 0, sessions: 0 }
        );
    }, [filteredSessions]);

    const dailyMax = useMemo(() => {
        const daily = data?.daily || [];
        return Math.max(
            ...daily.map((item) => (chartMode === 'tokens' ? item.totalTokens : item.totalCost)),
            1
        );
    }, [chartMode, data?.daily]);

    const handleRangeSelect = useCallback((range: 'Today' | '7d' | '30d') => {
        setDateRange(range);
        const end = new Date();
        const start = new Date();
        if (range === '7d') start.setDate(end.getDate() - 7);
        if (range === '30d') start.setDate(end.getDate() - 30);
        setEndDate(toDateInputValue(end));
        setStartDate(toDateInputValue(start));
    }, []);

    const handleExport = useCallback(() => {
        const csv = toSessionCsv(filteredSessions);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        downloadText(csv, `powerdirector-usage-sessions-${stamp}.csv`);
    }, [filteredSessions]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-[var(--pd-text-main)] mb-1">Usage</h1>
                <p className="text-[13px] text-[var(--pd-text-muted)]">
                    Token/cost trends and session-level usage for the selected date range.
                </p>
            </div>

            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-3 flex flex-wrap items-center gap-3">
                <div className="text-[13px] font-medium mr-1">Filters</div>
                <div className="flex bg-[var(--pd-surface-sidebar)] rounded-md border border-[var(--pd-border)] p-0.5">
                    {(['Today', '7d', '30d'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => handleRangeSelect(r)}
                            className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                                dateRange === r
                                    ? 'bg-[var(--pd-bg-elevated)] shadow-sm text-[var(--pd-text-main)]'
                                    : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded px-2 py-1 text-[12px] outline-none"
                    />
                    <span className="text-[12px] text-[var(--pd-text-muted)]">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded px-2 py-1 text-[12px] outline-none"
                    />
                </div>

                <div className="flex bg-[var(--pd-surface-sidebar)] rounded-md border border-[var(--pd-border)] p-0.5">
                    <button
                        onClick={() => setChartMode('tokens')}
                        className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                            chartMode === 'tokens'
                                ? 'bg-[var(--pd-accent)] text-white'
                                : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'
                        }`}
                    >
                        Tokens
                    </button>
                    <button
                        onClick={() => setChartMode('cost')}
                        className={`px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                            chartMode === 'cost'
                                ? 'bg-[var(--pd-accent)] text-white'
                                : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-main)]'
                        }`}
                    >
                        Cost
                    </button>
                </div>

                <button
                    onClick={() => void fetchData()}
                    className="px-3 py-1.5 rounded text-[12px] border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] flex items-center gap-1.5"
                >
                    <RefreshCw size={13} /> Refresh
                </button>

                <button
                    onClick={handleExport}
                    disabled={filteredSessions.length === 0}
                    className="px-3 py-1.5 rounded text-[12px] border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] disabled:opacity-50 flex items-center gap-1.5"
                >
                    <Download size={13} /> Export CSV
                </button>
            </section>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-[var(--pd-text-muted)]" size={14} />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Filter sessions (key, label, agent, model, tokens, cost)"
                    className="w-full pl-9 pr-4 py-2 bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded text-[13px] outline-none focus:border-[var(--pd-accent)] transition-colors"
                />
            </div>

            {error && (
                <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                </div>
            )}

            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)] mb-1">Activity by Time</h2>
                        <p className="text-[13px] text-[var(--pd-text-muted)]">Aggregated usage activity over the selected range.</p>
                    </div>
                    <div className="text-[15px] font-semibold">
                        {data ? formatTokens(data.stats.totalTokens) : '0'} tokens
                    </div>
                </div>

                {data?.stats.hasData ? (
                    <div className="flex gap-8">
                        <div className="w-32 flex-shrink-0">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--pd-text-muted)] mb-2">Day of Week</div>
                            <div className="space-y-1">
                                {data.stats.weekdayTotals.map((day) => (
                                    <div key={day.label} className="flex justify-between text-[12px] py-0.5">
                                        <span className="text-[var(--pd-text-muted)]">{day.label}</span>
                                        <span>{formatTokens(day.tokens)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-[var(--pd-text-muted)] mb-2">
                                <span>Hours</span>
                                <span>0 → 23</span>
                            </div>
                            <div className="grid grid-cols-[repeat(24,1fr)] gap-0.5 h-16">
                                {data.stats.hourTotals.map((value, index) => {
                                    const max = Math.max(...data.stats.hourTotals, 1);
                                    const opacity = max > 0 ? value / max : 0;
                                    return (
                                        <div
                                            key={index}
                                            className="bg-[var(--pd-accent)] rounded-[1px] hover:opacity-80 transition-opacity"
                                            style={{ opacity: Math.max(0.1, opacity) }}
                                            title={`${index}:00 - ${formatTokens(value)} tokens`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-[13px] text-[var(--pd-text-muted)]">
                        {loading ? 'Loading activity…' : 'No timeline data yet.'}
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm min-h-[300px]">
                    <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)] mb-6">Daily Usage</h2>
                    {data?.daily?.length ? (
                        <div className="flex items-end justify-between h-48 gap-1">
                            {data.daily.map((day) => {
                                const val = chartMode === 'tokens' ? day.totalTokens : day.totalCost;
                                const pct = (val / dailyMax) * 100;
                                return (
                                    <div key={day.date} className="flex-1 flex flex-col justify-end items-center group cursor-pointer relative">
                                        <div
                                            className="w-full bg-[var(--pd-accent)] opacity-80 group-hover:opacity-100 rounded-t-[1px] transition-all"
                                            style={{ height: `${Math.max(1, pct)}%`, minHeight: '1px' }}
                                            title={`${day.date}: ${chartMode === 'tokens' ? formatTokens(day.totalTokens) : formatCost(day.totalCost)}`}
                                        />
                                        <div className="mt-2 text-[10px] text-[var(--pd-text-muted)] absolute -bottom-5">
                                            {day.date.slice(8)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-[13px] text-[var(--pd-text-muted)]">
                            {loading ? 'Loading…' : 'No data'}
                        </div>
                    )}
                </section>

                <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm min-h-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Sessions</h2>
                        <div className="text-[12px] text-[var(--pd-text-muted)]">
                            {filteredSessions.length} shown
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-[var(--pd-text-muted)] mb-3">
                        <div>
                            <span>{sessionTotals.sessions ? Math.round(sessionTotals.tokens / sessionTotals.sessions) : 0} avg tokens</span>
                            <span className="mx-2">{sessionTotals.errors} errors</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="usage-sort">Sort</label>
                            <select
                                id="usage-sort"
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value as SortMode)}
                                className="bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] rounded px-2 py-0.5 outline-none"
                            >
                                <option value="recent">Recent</option>
                                <option value="tokens">Tokens</option>
                                <option value="cost">Cost</option>
                            </select>
                        </div>
                    </div>

                    {filteredSessions.length > 0 ? (
                        <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                            {filteredSessions.map((session) => (
                                <div key={session.key} className="p-2 hover:bg-[var(--pd-surface-sidebar)] rounded flex justify-between items-center group">
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-medium text-[var(--pd-text-main)] truncate">
                                            {session.label || session.key}
                                        </div>
                                        <div className="text-[11px] text-[var(--pd-text-muted)] truncate">
                                            {session.usage.totalTokens} tokens · {session.usage.messageCounts.total} msgs · {session.model}
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-[var(--pd-text-muted)] pl-2">{formatCost(session.usage.totalCost)}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-[13px] text-[var(--pd-text-muted)]">
                            {loading ? 'Loading sessions…' : 'No sessions in range'}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
