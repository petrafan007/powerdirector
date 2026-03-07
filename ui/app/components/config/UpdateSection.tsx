'use client';

import { useEffect, useState } from 'react';
import ConfigSectionRenderer from './ConfigSectionRenderer';

type JsonSchema = {
    type?: string | string[];
    title?: string;
    description?: string;
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema | JsonSchema[];
    additionalProperties?: JsonSchema | boolean;
    enum?: unknown[];
    const?: unknown;
    default?: unknown;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    allOf?: JsonSchema[];
    nullable?: boolean;
};

type UpdateJobStep = {
    name: string;
    command: string;
    index: number;
    total: number;
    status: 'running' | 'ok' | 'error';
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    exitCode?: number | null;
    stderrTail?: string | null;
};

type UpdateJob = {
    id: string;
    channel: string;
    status: 'running' | 'ok' | 'error';
    restartReady: boolean;
    error?: string;
    steps: UpdateJobStep[];
};

type UpdateStatus = {
    currentVersion: string;
    selectedChannel: string;
    installKind: 'git' | 'package' | 'unknown';
    git: {
        tag: string | null;
        branch: string | null;
        behind: number | null;
        ahead: number | null;
        dirty: boolean | null;
    } | null;
    updateAvailable: {
        currentVersion: string;
        latestVersion: string;
        channel: string;
    } | null;
    job: UpdateJob | null;
};

type UpdateSectionProps = {
    schema: JsonSchema;
    data: any;
    onUpdate: (path: string, value: any) => void;
};

function statusLabel(step: UpdateJobStep): string {
    if (step.status === 'ok') return 'Done';
    if (step.status === 'error') return 'Failed';
    return 'Running';
}

function statusTone(step: UpdateJobStep): string {
    if (step.status === 'ok') return 'text-emerald-300';
    if (step.status === 'error') return 'text-red-300';
    return 'text-blue-300';
}

export default function UpdateSection({ schema, data, onUpdate }: UpdateSectionProps) {
    const [status, setStatus] = useState<UpdateStatus | null>(null);
    const [job, setJob] = useState<UpdateJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [startingInstall, setStartingInstall] = useState(false);
    const [restarting, setRestarting] = useState(false);

    const selectedChannel =
        typeof data?.channel === 'string' && data.channel.trim().length > 0
            ? data.channel.trim()
            : (status?.selectedChannel || 'stable');

    const loadStatus = async (refresh = false) => {
        setLoading(true);
        setStatusError(null);
        try {
            const res = await fetch(`/api/update${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error || 'Failed to load update status');
            }
            setStatus(json);
            setJob(json?.job ?? null);
        } catch (error: any) {
            setStatusError(error?.message || 'Failed to load update status');
        } finally {
            setLoading(false);
        }
    };

    const pollJob = async (jobId: string) => {
        try {
            const res = await fetch(`/api/update?jobId=${encodeURIComponent(jobId)}`, {
                cache: 'no-store'
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error || 'Failed to poll update progress');
            }
            const nextJob = json?.job ?? null;
            setJob(nextJob);
            if (nextJob && nextJob.status !== 'running') {
                setStartingInstall(false);
                await loadStatus(true);
            }
        } catch (error: any) {
            setModalError(error?.message || 'Failed to poll update progress');
        }
    };

    useEffect(() => {
        void loadStatus(true);
    }, []);

    useEffect(() => {
        const activeJob = job ?? status?.job ?? null;
        if (!activeJob || activeJob.status !== 'running') {
            return;
        }

        const timer = window.setInterval(() => {
            void pollJob(activeJob.id);
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [job, status?.job]);

    const handleInstallNow = async () => {
        setModalOpen(true);
        setModalError(null);
        setStartingInstall(true);
        try {
            const res = await fetch('/api/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: selectedChannel })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json?.job) {
                throw new Error(json?.error || 'Failed to start update install');
            }
            setJob(json.job);
        } catch (error: any) {
            setStartingInstall(false);
            setModalError(error?.message || 'Failed to start update install');
        }
    };

    const handleRestart = async () => {
        setRestarting(true);
        setModalError(null);
        try {
            const res = await fetch('/api/update/restart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.error || 'Failed to restart application');
            }
        } catch (error: any) {
            setModalError(error?.message || 'Failed to restart application');
            setRestarting(false);
        }
    };

    const activeJob = job ?? status?.job ?? null;
    const isRunning = activeJob?.status === 'running' || startingInstall;

    return (
        <div className="space-y-8">
            <ConfigSectionRenderer
                sectionId="update"
                schema={schema}
                data={data}
                onUpdate={onUpdate}
            />

            <section
                className="rounded-2xl border p-6 shadow-sm"
                style={{
                    background: 'var(--pd-surface-panel)',
                    borderColor: 'var(--pd-border)'
                }}
            >
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-bold" style={{ color: 'var(--pd-text-main)' }}>Install Updates</h3>
                        <p className="text-sm" style={{ color: 'var(--pd-text-muted)' }}>
                            Startup checks and automatic installs use the saved configuration. Install Now uses the channel currently shown in this form.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel-2)' }}>
                            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--pd-text-muted)' }}>Current Version</div>
                            <div className="mt-2 text-lg font-semibold" style={{ color: 'var(--pd-text-main)' }}>{status?.currentVersion || 'Loading...'}</div>
                        </div>
                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel-2)' }}>
                            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--pd-text-muted)' }}>Selected Channel</div>
                            <div className="mt-2 text-lg font-semibold" style={{ color: 'var(--pd-text-main)' }}>{selectedChannel}</div>
                        </div>
                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel-2)' }}>
                            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--pd-text-muted)' }}>Install Type</div>
                            <div className="mt-2 text-lg font-semibold capitalize" style={{ color: 'var(--pd-text-main)' }}>{status?.installKind || 'Loading...'}</div>
                        </div>
                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel-2)' }}>
                            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--pd-text-muted)' }}>Available</div>
                            <div className="mt-2 text-lg font-semibold" style={{ color: 'var(--pd-text-main)' }}>
                                {status?.updateAvailable?.latestVersion || 'No update detected'}
                            </div>
                        </div>
                    </div>

                    {status?.git && (
                        <div
                            className="rounded-xl border px-4 py-3 text-sm"
                            style={{
                                borderColor: 'var(--pd-border)',
                                background: 'var(--pd-surface-panel-2)',
                                color: 'var(--pd-text-muted)'
                            }}
                        >
                            Git checkout:
                            {' '}
                            <span style={{ color: 'var(--pd-text-main)' }}>
                                {status.git.tag || status.git.branch || 'detached'}
                            </span>
                            {typeof status.git.behind === 'number' ? ` · behind ${status.git.behind}` : ''}
                            {typeof status.git.ahead === 'number' ? ` · ahead ${status.git.ahead}` : ''}
                            {status.git.dirty ? ' · dirty worktree' : ''}
                        </div>
                    )}

                    {statusError && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {statusError}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void loadStatus(true)}
                            disabled={loading || isRunning}
                            className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                                borderColor: 'var(--pd-border)',
                                background: 'var(--pd-surface-panel-2)',
                                color: 'var(--pd-text-main)'
                            }}
                        >
                            {loading ? 'Checking...' : 'Check Now'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleInstallNow()}
                            disabled={isRunning}
                            className="rounded-xl px-5 py-2 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ background: 'var(--pd-accent)' }}
                        >
                            {isRunning ? 'Installing...' : 'Install Now'}
                        </button>
                    </div>
                </div>
            </section>

            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setModalOpen(false)}
                    />

                    <div
                        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border shadow-2xl"
                        style={{
                            background: 'var(--pd-surface-sidebar)',
                            borderColor: 'var(--pd-border)',
                            color: 'var(--pd-text-main)'
                        }}
                    >
                        <div className="border-b px-6 py-5" style={{ borderColor: 'var(--pd-border)' }}>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold">Update Progress</h3>
                                    <p className="mt-1 text-sm" style={{ color: 'var(--pd-text-muted)' }}>
                                        Installing the latest {selectedChannel} release for this instance.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-full px-3 py-1 text-sm"
                                    style={{ color: 'var(--pd-text-muted)' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 px-6 py-5">
                            {modalError && (
                                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                    {modalError}
                                </div>
                            )}

                            {!activeJob && (
                                <div className="rounded-2xl border px-4 py-5 text-sm" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                    Preparing update job...
                                </div>
                            )}

                            {activeJob && (
                                <div className="space-y-3">
                                    <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                        Status:
                                        {' '}
                                        <span className="font-semibold" style={{ color: 'var(--pd-text-main)' }}>
                                            {activeJob.status === 'running' ? 'Installing' : activeJob.status === 'ok' ? 'Ready to restart' : 'Install failed'}
                                        </span>
                                    </div>

                                    <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                                        {activeJob.steps.length === 0 && (
                                            <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel)' }}>
                                                Waiting for the updater to start...
                                            </div>
                                        )}

                                        {activeJob.steps.map((step) => (
                                            <div
                                                key={`${step.index}:${step.name}`}
                                                className="rounded-2xl border px-4 py-4"
                                                style={{
                                                    borderColor: step.status === 'error' ? 'rgba(239, 68, 68, 0.35)' : 'var(--pd-border)',
                                                    background: 'var(--pd-surface-panel)'
                                                }}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold" style={{ color: 'var(--pd-text-main)' }}>
                                                            {step.index + 1}. {step.name}
                                                        </div>
                                                        <div className="mt-1 font-mono text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                                                            {step.command}
                                                        </div>
                                                    </div>
                                                    <div className={`text-sm font-semibold ${statusTone(step)}`}>
                                                        {statusLabel(step)}
                                                    </div>
                                                </div>
                                                {typeof step.durationMs === 'number' && (
                                                    <div className="mt-3 text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                                                        {Math.max(0, Math.round(step.durationMs / 100) / 10)}s
                                                    </div>
                                                )}
                                                {step.stderrTail && (
                                                    <pre
                                                        className="mt-3 overflow-x-auto rounded-xl px-3 py-3 text-xs"
                                                        style={{
                                                            background: 'rgba(15, 23, 42, 0.55)',
                                                            color: 'var(--pd-text-muted)'
                                                        }}
                                                    >
                                                        {step.stderrTail}
                                                    </pre>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {activeJob.error && (
                                        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                            {activeJob.error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t px-6 py-5" style={{ borderColor: 'var(--pd-border)' }}>
                            {activeJob?.status === 'ok' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="rounded-xl border px-4 py-2 text-sm font-semibold"
                                        style={{
                                            borderColor: 'var(--pd-border)',
                                            background: 'var(--pd-surface-panel-2)',
                                            color: 'var(--pd-text-main)'
                                        }}
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleRestart()}
                                        disabled={restarting}
                                        className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                                        style={{ background: 'var(--pd-accent)' }}
                                    >
                                        {restarting ? 'Restarting...' : 'Restart'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-xl border px-4 py-2 text-sm font-semibold"
                                    style={{
                                        borderColor: 'var(--pd-border)',
                                        background: 'var(--pd-surface-panel-2)',
                                        color: 'var(--pd-text-main)'
                                    }}
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
