'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type CronStatus = {
    enabled?: boolean;
    jobs?: number;
    inFlight?: number;
    maxConcurrent?: number;
    nextWakeAtMs?: number | null;
};

type CronJob = {
    id: string;
    name: string;
    schedule: string;
    action: string;
    payload: string;
    channel: string;
    enabled: boolean;
    agentId?: string;
    description?: string;
    sessionTarget?: string;
};

type CronPayload = {
    jobs?: CronJob[];
    status?: CronStatus;
    error?: string;
    message?: string;
};

function formatNextWake(value?: number | null): string {
    if (!value || !Number.isFinite(value)) return 'n/a';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'n/a';
    return `${date.toLocaleString()} (${Math.max(0, Math.round((value - Date.now()) / 1000))}s)`;
}

export default function CronPage() {
    const [jobs, setJobs] = useState<CronJob[]>([]);
    const [status, setStatus] = useState<CronStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadCron = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/cron/list', { cache: 'no-store' });
            const payload = (await response.json().catch(() => ({}))) as CronPayload;
            if (!response.ok) {
                throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
            }
            setJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
            setStatus(payload.status || null);
        } catch (loadError: unknown) {
            const message = loadError instanceof Error ? loadError.message : 'Failed to load cron status';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCron();
    }, [loadCron]);

    const orderedJobs = useMemo(() => {
        return [...jobs].sort((a, b) => {
            if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    }, [jobs]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-4">
            <section className="rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold text-[var(--pd-text-main)]">Cron Jobs</h1>
                        <p className="text-sm text-[var(--pd-text-muted)]">Gateway scheduler status and configured jobs.</p>
                    </div>
                    <button
                        onClick={() => void loadCron()}
                        disabled={loading}
                        className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] px-3 py-1.5 text-sm hover:bg-[var(--pd-button-hover)] disabled:opacity-60"
                    >
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                    <div className="rounded border border-[var(--pd-border)] p-3">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--pd-text-muted)]">Enabled</div>
                        <div className="mt-1 text-sm">{status ? (status.enabled ? 'Yes' : 'No') : 'n/a'}</div>
                    </div>
                    <div className="rounded border border-[var(--pd-border)] p-3">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--pd-text-muted)]">Jobs</div>
                        <div className="mt-1 text-sm">{status?.jobs ?? jobs.length}</div>
                    </div>
                    <div className="rounded border border-[var(--pd-border)] p-3">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--pd-text-muted)]">In flight</div>
                        <div className="mt-1 text-sm">{status?.inFlight ?? 'n/a'}</div>
                    </div>
                    <div className="rounded border border-[var(--pd-border)] p-3">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--pd-text-muted)]">Max concurrent</div>
                        <div className="mt-1 text-sm">{status?.maxConcurrent ?? 'n/a'}</div>
                    </div>
                    <div className="rounded border border-[var(--pd-border)] p-3">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--pd-text-muted)]">Next wake</div>
                        <div className="mt-1 text-sm">{formatNextWake(status?.nextWakeAtMs)}</div>
                    </div>
                </div>

                {error && (
                    <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}
            </section>

            <section className="rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-[var(--pd-text-main)]">Jobs</h2>
                    <Link href="/config/cron" className="text-xs text-[var(--pd-accent)] hover:underline">
                        Open Config/Cron
                    </Link>
                </div>

                {orderedJobs.length === 0 ? (
                    <div className="mt-3 rounded border border-[var(--pd-border)] bg-[var(--pd-surface-main)] p-4 text-sm text-[var(--pd-text-muted)]">
                        No active cron jobs.
                    </div>
                ) : (
                    <div className="mt-3 space-y-3">
                        {orderedJobs.map((job) => (
                            <article
                                key={job.id}
                                className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-main)] p-3"
                            >
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-sm font-semibold text-[var(--pd-text-main)]">{job.name}</h3>
                                            <span
                                                className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                                                    job.enabled
                                                        ? 'bg-green-500/20 text-green-300'
                                                        : 'bg-yellow-500/20 text-yellow-300'
                                                }`}
                                            >
                                                {job.enabled ? 'enabled' : 'disabled'}
                                            </span>
                                            <span className="rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-[10px] uppercase text-[var(--pd-text-muted)]">
                                                {job.sessionTarget || job.action || 'message'}
                                            </span>
                                        </div>
                                        {job.description && (
                                            <p className="mt-1 text-xs text-[var(--pd-text-muted)]">{job.description}</p>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase text-[var(--pd-text-muted)]">
                                            <span className="rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 font-mono">
                                                {job.schedule}
                                            </span>
                                            <span className="rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 font-mono">
                                                {job.channel || 'cron'}
                                            </span>
                                            {job.agentId && (
                                                <span className="rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 font-mono">
                                                    {job.agentId}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="min-w-0 max-w-full text-xs text-[var(--pd-text-muted)] md:max-w-[55%]">
                                        <div className="text-[10px] uppercase tracking-wider opacity-70">Payload</div>
                                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-[var(--pd-text-main)]">
                                            {job.payload || '-'}
                                        </pre>
                                        <div className="mt-1 text-[10px] opacity-70">{job.id}</div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
