'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LogEntry = {
    raw: string;
    time?: string | null;
    level?: LogLevel | null;
    subsystem?: string | null;
    message?: string | null;
    meta?: Record<string, unknown>;
};

type LogsTailPayload = {
    file?: string;
    cursor?: number;
    size?: number;
    lines?: unknown;
    truncated?: boolean;
    reset?: boolean;
};

const LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const LOG_BUFFER_LIMIT = 2000;

function parseMaybeJsonString(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
    try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
}

function normalizeLevel(value: unknown): LogLevel | null {
    if (typeof value !== 'string') return null;
    const lowered = value.toLowerCase() as LogLevel;
    return LEVELS.includes(lowered) ? lowered : null;
}

function parseLogLine(line: string): LogEntry {
    if (!line.trim()) {
        return { raw: line, message: line };
    }

    try {
        const obj = JSON.parse(line) as Record<string, unknown>;
        const meta = obj && typeof obj._meta === 'object' && obj._meta != null
            ? obj._meta as Record<string, unknown>
            : null;

        const time = typeof obj.time === 'string'
            ? obj.time
            : (typeof meta?.date === 'string' ? meta.date : null);
        const level = normalizeLevel(obj.level ?? meta?.logLevelName ?? meta?.level);

        const contextCandidate = typeof obj['0'] === 'string'
            ? obj['0']
            : (typeof meta?.name === 'string' ? meta.name : null);
        const contextObj = parseMaybeJsonString(contextCandidate);

        let subsystem: string | null = null;
        if (contextObj) {
            if (typeof contextObj.subsystem === 'string') {
                subsystem = contextObj.subsystem;
            } else if (typeof contextObj.module === 'string') {
                subsystem = contextObj.module;
            }
        }
        if (!subsystem && contextCandidate && contextCandidate.length < 120) {
            subsystem = contextCandidate;
        }

        let message: string | null = null;
        if (typeof obj.msg === 'string') {
            message = obj.msg;
        } else if (typeof obj.message === 'string') {
            message = obj.message;
        } else if (typeof obj['1'] === 'string') {
            message = obj['1'];
        } else if (!contextObj && typeof obj['0'] === 'string') {
            message = obj['0'];
        }

        return {
            raw: line,
            time,
            level,
            subsystem,
            message: message ?? line,
            meta: meta ?? undefined
        };
    } catch {
        return { raw: line, message: line };
    }
}

function formatTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString();
}

function formatExportFileName(label: string): string {
    const now = new Date();
    const iso = now.toISOString().replace(/[:.]/g, '-');
    return `powerdirector-logs-${label}-${iso}.log`;
}

function exportLines(lines: string[], label: string): void {
    if (lines.length === 0) return;
    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = formatExportFileName(label);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

export default function LogsPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<string | null>(null);
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [filterText, setFilterText] = useState('');
    const [levelFilters, setLevelFilters] = useState<Record<LogLevel, boolean>>({
        trace: true,
        debug: true,
        info: true,
        warn: true,
        error: true,
        fatal: true
    });
    const [autoFollow, setAutoFollow] = useState(true);
    const [truncated, setTruncated] = useState(false);
    const [cursor, setCursor] = useState<number | null>(null);
    const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
    const [limit] = useState(500);
    const [maxBytes] = useState(250_000);
    const [atBottom, setAtBottom] = useState(true);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const loadingRef = useRef(loading);
    useEffect(() => { loadingRef.current = loading; }, [loading]);

    const loadLogs = useCallback(async (opts?: { reset?: boolean; quiet?: boolean }) => {
        if (loadingRef.current && !opts?.quiet) {
            return;
        }
        if (!opts?.quiet) setLoading(true);
        setError(null);

        try {
            const query = new URLSearchParams();
            if (!opts?.reset && cursor != null) {
                query.set('cursor', String(cursor));
            }
            query.set('limit', String(limit));
            query.set('maxBytes', String(maxBytes));

            const response = await fetch(`/api/logs/tail?${query.toString()}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load logs.');
            }

            const data = payload as LogsTailPayload;
            const lines = Array.isArray(data.lines)
                ? data.lines.filter((entry): entry is string => typeof entry === 'string')
                : [];

            const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
            const sanitizedLines = lines.map(line => line.replace(ansiRegex, ''));

            const parsed = sanitizedLines.map(parseLogLine);
            const shouldReset = Boolean(opts?.reset || data.reset || cursor == null);

            setEntries((prev) => {
                if (shouldReset) return parsed;
                return [...prev, ...parsed].slice(-LOG_BUFFER_LIMIT);
            });
            if (typeof data.cursor === 'number' && Number.isFinite(data.cursor)) {
                setCursor(data.cursor);
            }
            if (typeof data.file === 'string') {
                setFile(data.file);
            }
            setTruncated(Boolean(data.truncated));
            setLastFetchAt(Date.now());
        } catch (fetchError: any) {
            setError(fetchError?.message || 'Failed to load logs.');
        } finally {
            if (!opts?.quiet) setLoading(false);
        }
    }, [cursor, limit, maxBytes]); // Removed 'loading' from dependencies

    useEffect(() => {
        void loadLogs({ reset: true });
    }, [loadLogs]);

    useEffect(() => {
        const poll = window.setInterval(() => {
            void loadLogs({ quiet: true });
        }, 2000);
        return () => window.clearInterval(poll);
    }, [loadLogs]);

    useEffect(() => {
        if (!autoFollow || !atBottom) return;
        const node = containerRef.current;
        if (!node) return;
        node.scrollTop = node.scrollHeight;
    }, [entries, autoFollow, atBottom]);

    const filteredEntries = useMemo(() => {
        const needle = filterText.trim().toLowerCase();
        return entries.filter((entry) => {
            if (entry.level && !levelFilters[entry.level]) {
                return false;
            }
            if (!needle) return true;
            const haystack = [entry.message, entry.subsystem, entry.raw]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(needle);
        });
    }, [entries, filterText, levelFilters]);

    const exportLabel = useMemo(() => {
        const levelFiltered = LEVELS.some((level) => !levelFilters[level]);
        return filterText.trim().length > 0 || levelFiltered ? 'filtered' : 'visible';
    }, [filterText, levelFilters]);

    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        const threshold = 24;
        const isBottom = target.scrollHeight - target.scrollTop - target.clientHeight <= threshold;
        setAtBottom(isBottom);
    }, []);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Logs</h2>
                        <p className="text-[13px] text-[var(--pd-text-muted)]">Gateway file logs (JSONL).</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => void loadLogs({ reset: true })}
                            disabled={loading}
                            className="px-3 py-1.5 rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] text-[13px] hover:bg-[var(--pd-button-hover)] disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                        <button
                            onClick={() => exportLines(filteredEntries.map((entry) => entry.raw), exportLabel)}
                            disabled={filteredEntries.length === 0}
                            className="px-3 py-1.5 rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] text-[13px] hover:bg-[var(--pd-button-hover)] disabled:opacity-50"
                        >
                            Export {exportLabel}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3 mt-4">
                    <label className="text-sm min-w-[240px] flex-1">
                        <div className="text-[12px] mb-1 text-[var(--pd-text-muted)]">Filter</div>
                        <input
                            value={filterText}
                            onChange={(event) => setFilterText(event.target.value)}
                            placeholder="Search logs"
                            className="w-full px-3 py-2 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] text-sm"
                        />
                    </label>

                    <label className="text-sm flex items-center gap-2 px-3 py-2 rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)]">
                        <span className="text-[12px] text-[var(--pd-text-muted)]">Auto-follow</span>
                        <input
                            type="checkbox"
                            checked={autoFollow}
                            onChange={(event) => setAutoFollow(event.target.checked)}
                        />
                    </label>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                    {LEVELS.map((level) => (
                        <label
                            key={level}
                            className={`px-2 py-1 rounded border text-xs uppercase tracking-wide cursor-pointer ${levelFilters[level]
                                ? 'bg-[var(--pd-surface-sidebar)] border-[var(--pd-border)] text-[var(--pd-text-main)]'
                                : 'bg-transparent border-[var(--pd-border)] text-[var(--pd-text-muted)] opacity-60'}`}
                        >
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={levelFilters[level]}
                                onChange={(event) => setLevelFilters((prev) => ({ ...prev, [level]: event.target.checked }))}
                            />
                            {level}
                        </label>
                    ))}
                </div>

                {file && (
                    <div className="mt-3 text-[12px] text-[var(--pd-text-muted)]">
                        File: <span className="font-mono">{file}</span>
                    </div>
                )}
                {truncated && (
                    <div className="mt-2 px-3 py-2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[13px]">
                        Log output truncated; showing latest chunk.
                    </div>
                )}
                {error && (
                    <div className="mt-2 px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-[13px]">
                        {error}
                    </div>
                )}

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="mt-3 h-[62vh] overflow-y-auto rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)]"
                >
                    {filteredEntries.length === 0 ? (
                        <div className="p-4 text-sm text-[var(--pd-text-muted)]">No log entries.</div>
                    ) : (
                        <div className="divide-y divide-[var(--pd-border)]">
                            {filteredEntries.map((entry, index) => (
                                <div key={`${entry.time ?? 'na'}-${index}`} className="grid grid-cols-[110px_70px_220px_1fr] gap-2 text-xs p-2 font-mono">
                                    <div className="text-[var(--pd-text-muted)]">{formatTime(entry.time)}</div>
                                    <div className="uppercase text-[var(--pd-text-main)]">{entry.level || ''}</div>
                                    <div className="text-[var(--pd-text-muted)]">{entry.subsystem || ''}</div>
                                    <div className="text-[var(--pd-text-main)] whitespace-pre-wrap break-all">{entry.message || entry.raw}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {lastFetchAt && (
                    <div className="mt-2 text-[11px] text-[var(--pd-text-muted)]">
                        Last fetch: {new Date(lastFetchAt).toLocaleTimeString()}
                    </div>
                )}
            </section>
        </div>
    );
}
