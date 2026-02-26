'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type EventLogEntry = {
    ts: number;
    event: string;
    payload?: unknown;
};

type DebugSnapshot = {
    status: Record<string, unknown>;
    health: Record<string, unknown>;
    models: unknown[];
    heartbeat: Record<string, unknown>;
    eventLog: EventLogEntry[];
};

function asObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : {};
}

function stringifySafe(value: unknown): string {
    try {
        return JSON.stringify(value, (_key, next) => {
            if (typeof next === 'bigint') {
                const asNumber = Number(next);
                return Number.isSafeInteger(asNumber) ? asNumber : next.toString();
            }
            return next;
        }, 2);
    } catch {
        return String(value);
    }
}

function formatEventPayload(payload: unknown): string {
    if (payload == null) return '';
    return stringifySafe(payload);
}

export default function DebugPage() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<Record<string, unknown> | null>(null);
    const [health, setHealth] = useState<Record<string, unknown> | null>(null);
    const [models, setModels] = useState<unknown[]>([]);
    const [heartbeat, setHeartbeat] = useState<Record<string, unknown> | null>(null);
    const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
    const [callMethod, setCallMethod] = useState('');
    const [callParams, setCallParams] = useState('{}');
    const [callResult, setCallResult] = useState<string | null>(null);
    const [callError, setCallError] = useState<string | null>(null);

    const loadDebug = useCallback(async (quiet: boolean = false) => {
        if (!quiet) setLoading(true);
        try {
            const response = await fetch('/api/debug/snapshot', { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to load debug snapshot.');
            }

            const snapshot = payload as DebugSnapshot;
            setStatus(asObject(snapshot.status));
            setHealth(asObject(snapshot.health));
            setModels(Array.isArray(snapshot.models) ? snapshot.models : []);
            setHeartbeat(asObject(snapshot.heartbeat));
            setEventLog(Array.isArray(snapshot.eventLog) ? snapshot.eventLog : []);
            if (!quiet) {
                setCallError(null);
            }
        } catch (error: any) {
            if (!quiet) {
                setCallError(error?.message || 'Failed to load debug snapshot.');
            }
        } finally {
            if (!quiet) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDebug();
    }, [loadDebug]);

    useEffect(() => {
        const poll = window.setInterval(() => {
            void loadDebug(true);
        }, 3000);
        return () => window.clearInterval(poll);
    }, [loadDebug]);

    const handleCall = useCallback(async () => {
        setCallError(null);
        setCallResult(null);
        try {
            const method = callMethod.trim();
            if (!method) {
                throw new Error('Method is required.');
            }
            const params = callParams.trim().length > 0 ? JSON.parse(callParams) : {};

            const response = await fetch('/api/debug/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, params })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.ok === false) {
                throw new Error(typeof payload?.error === 'string' ? payload.error : 'Debug call failed.');
            }

            setCallResult(stringifySafe(payload?.result ?? payload));
        } catch (error: any) {
            setCallError(error?.message || 'Debug call failed.');
        }
    }, [callMethod, callParams]);

    const securitySummary = useMemo(() => {
        const statusObject = asObject(status);
        const audit = asObject(statusObject.securityAudit);
        return asObject(audit.summary);
    }, [status]);

    const critical = typeof securitySummary.critical === 'number' ? securitySummary.critical : 0;
    const warn = typeof securitySummary.warn === 'number' ? securitySummary.warn : 0;
    const info = typeof securitySummary.info === 'number' ? securitySummary.info : 0;

    const securityTone = critical > 0
        ? 'border-red-500/40 bg-red-500/10 text-red-300'
        : warn > 0
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';

    const securityLabel = critical > 0
        ? `${critical} critical`
        : (warn > 0 ? `${warn} warnings` : 'No critical issues');

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-5">
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Snapshots</h2>
                            <p className="text-[13px] text-[var(--pd-text-muted)]">Status, health, and heartbeat data.</p>
                        </div>
                        <button
                            onClick={() => void loadDebug()}
                            disabled={loading}
                            className="px-3 py-1.5 rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] text-[13px] hover:bg-[var(--pd-button-hover)] disabled:opacity-50"
                        >
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                    {Object.keys(securitySummary).length > 0 && (
                        <div className={`mt-3 px-3 py-2 rounded border text-[13px] ${securityTone}`}>
                            Security audit: {securityLabel}{info > 0 ? ` · ${info} info` : ''}.
                        </div>
                    )}

                    <div className="space-y-3 mt-3">
                        <div>
                            <div className="text-xs uppercase tracking-wide text-[var(--pd-text-muted)] mb-1">Status</div>
                            <pre className="text-xs p-3 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] overflow-x-auto text-[var(--pd-text-main)]">{stringifySafe(status || {})}</pre>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-[var(--pd-text-muted)] mb-1">Health</div>
                            <pre className="text-xs p-3 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] overflow-x-auto text-[var(--pd-text-main)]">{stringifySafe(health || {})}</pre>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wide text-[var(--pd-text-muted)] mb-1">Last heartbeat</div>
                            <pre className="text-xs p-3 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] overflow-x-auto text-[var(--pd-text-main)]">{stringifySafe(heartbeat || {})}</pre>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5">
                    <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Manual RPC</h2>
                    <p className="text-[13px] text-[var(--pd-text-muted)]">Send a raw gateway method with JSON params.</p>

                    <div className="space-y-3 mt-4">
                        <label className="block text-sm">
                            <div className="text-[12px] mb-1 text-[var(--pd-text-muted)]">Method</div>
                            <input
                                value={callMethod}
                                onChange={(event) => setCallMethod(event.target.value)}
                                placeholder="status"
                                className="w-full px-3 py-2 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] text-sm"
                            />
                        </label>
                        <label className="block text-sm">
                            <div className="text-[12px] mb-1 text-[var(--pd-text-muted)]">Params (JSON)</div>
                            <textarea
                                value={callParams}
                                onChange={(event) => setCallParams(event.target.value)}
                                rows={7}
                                className="w-full px-3 py-2 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] text-sm font-mono"
                            />
                        </label>
                    </div>

                    <div className="mt-3">
                        <button
                            onClick={() => void handleCall()}
                            className="px-3 py-1.5 rounded text-[13px] bg-[var(--pd-accent)] text-white hover:brightness-110"
                        >
                            Call
                        </button>
                    </div>

                    {callError && (
                        <div className="mt-3 px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
                            {callError}
                        </div>
                    )}

                    {callResult && (
                        <pre className="mt-3 text-xs p-3 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] overflow-x-auto text-[var(--pd-text-main)]">{callResult}</pre>
                    )}
                </div>
            </section>

            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5">
                <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Models</h2>
                <p className="text-[13px] text-[var(--pd-text-muted)]">Catalog from models.list.</p>
                <pre className="mt-3 text-xs p-3 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] overflow-x-auto text-[var(--pd-text-main)]">{stringifySafe(models)}</pre>
            </section>

            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5">
                <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Event Log</h2>
                <p className="text-[13px] text-[var(--pd-text-muted)]">Latest gateway events.</p>

                {eventLog.length === 0 ? (
                    <div className="text-sm text-[var(--pd-text-muted)] mt-3">No events yet.</div>
                ) : (
                    <div className="space-y-2 mt-3">
                        {eventLog.map((entry, index) => (
                            <div key={`${entry.ts}-${entry.event}-${index}`} className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm font-semibold text-[var(--pd-text-main)]">{entry.event}</div>
                                    <div className="text-xs text-[var(--pd-text-muted)]">{new Date(entry.ts).toLocaleTimeString()}</div>
                                </div>
                                <pre className="mt-2 text-xs p-2 rounded bg-[var(--pd-surface-main)] border border-[var(--pd-border)] overflow-x-auto text-[var(--pd-text-main)]">{formatEventPayload(entry.payload)}</pre>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
