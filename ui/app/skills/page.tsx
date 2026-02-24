'use client';

import { useCallback, useMemo, useState } from 'react';
import { useEffect } from 'react';

type SkillInstallEntry = {
    id?: string;
    label?: string;
    kind?: string;
};

type SkillInfo = {
    id: string;
    name: string;
    description?: string;
    source?: string;
    enabled?: boolean;
    status?: string;
    missingBins?: string[];
    install?: SkillInstallEntry[];
    hasRunner?: boolean;
    apiKey?: string;
    requiresApiKey?: boolean;
};

type SkillsPayload = {
    report?: {
        skills?: SkillInfo[];
    };
    allSkills?: SkillInfo[];
    skills?: SkillInfo[];
    workspaceSkills?: SkillInfo[];
    pluginSkills?: SkillInfo[];
};

type SkillMessage = {
    kind: 'success' | 'error';
    text: string;
};

function normalizeSkills(payload: SkillsPayload): SkillInfo[] {
    if (Array.isArray(payload.report?.skills)) {
        return payload.report.skills;
    }
    if (Array.isArray(payload.allSkills)) {
        return payload.allSkills;
    }

    const map = new Map<string, SkillInfo>();
    for (const list of [payload.skills, payload.workspaceSkills, payload.pluginSkills]) {
        for (const skill of Array.isArray(list) ? list : []) {
            if (!skill || typeof skill.id !== 'string' || skill.id.trim().length === 0) {
                continue;
            }
            map.set(skill.id, skill);
        }
    }
    return [...map.values()];
}

function bySourceOrder(source: string): number {
    if (source === 'powerdirector-bundled') return 0;
    if (source === 'powerdirector-workspace') return 1;
    if (source === 'powerdirector-plugin') return 2;
    return 3;
}

function sourceLabel(source?: string): string {
    if (source === 'powerdirector-bundled') return 'Bundled';
    if (source === 'powerdirector-workspace') return 'Workspace';
    if (source === 'powerdirector-plugin') return 'Plugin';
    return 'Other';
}

export default function SkillsPage() {
    const [skills, setSkills] = useState<SkillInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<string, SkillMessage>>({});
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

    const loadSkills = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/skills', { cache: 'no-store' });
            const payload = (await response.json().catch(() => ({}))) as SkillsPayload & {
                error?: string;
                message?: string;
            };
            if (!response.ok) {
                throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
            }
            const list = normalizeSkills(payload);
            setSkills(list);
            setApiKeys((prev) => {
                const next: Record<string, string> = { ...prev };
                for (const skill of list) {
                    if (typeof next[skill.id] !== 'string') {
                        next[skill.id] = typeof skill.apiKey === 'string' ? skill.apiKey : '';
                    }
                }
                return next;
            });
        } catch (fetchError: unknown) {
            const message = fetchError instanceof Error ? fetchError.message : 'Failed to load skills';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSkills();
    }, [loadSkills]);

    const filteredSkills = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        const sorted = [...skills].sort((a, b) => {
            const sourceA = bySourceOrder(a.source ?? '');
            const sourceB = bySourceOrder(b.source ?? '');
            if (sourceA !== sourceB) return sourceA - sourceB;
            return a.name.localeCompare(b.name);
        });

        if (!needle) return sorted;
        return sorted.filter((skill) =>
            [skill.name, skill.description, sourceLabel(skill.source)]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(needle)
        );
    }, [filter, skills]);

    const toggleSkill = useCallback(
        async (skill: SkillInfo) => {
            const nextEnabled = !(skill.enabled !== false);
            setBusyKey(skill.id);
            setMessages((prev) => {
                const next = { ...prev };
                delete next[skill.id];
                return next;
            });
            try {
                const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: nextEnabled })
                });
                const payload = (await response.json().catch(() => ({}))) as {
                    success?: boolean;
                    message?: string;
                    error?: string;
                };
                if (!response.ok || payload.success === false) {
                    throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
                }
                setMessages((prev) => ({
                    ...prev,
                    [skill.id]: { kind: 'success', text: nextEnabled ? 'Enabled' : 'Disabled' }
                }));
                await loadSkills();
            } catch (toggleError: unknown) {
                const message = toggleError instanceof Error ? toggleError.message : 'Failed to update skill';
                setMessages((prev) => ({ ...prev, [skill.id]: { kind: 'error', text: message } }));
            } finally {
                setBusyKey(null);
            }
        },
        [loadSkills]
    );

    const installSkill = useCallback(
        async (skill: SkillInfo) => {
            setBusyKey(skill.id);
            setMessages((prev) => {
                const next = { ...prev };
                delete next[skill.id];
                return next;
            });
            try {
                const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}/install`, {
                    method: 'POST'
                });
                const payload = (await response.json().catch(() => ({}))) as {
                    success?: boolean;
                    message?: string;
                    error?: string;
                };
                if (!response.ok || payload.success === false) {
                    throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
                }
                setMessages((prev) => ({
                    ...prev,
                    [skill.id]: {
                        kind: 'success',
                        text: payload.message || 'Installation completed'
                    }
                }));
                await loadSkills();
            } catch (installError: unknown) {
                const message = installError instanceof Error ? installError.message : 'Failed to install dependencies';
                setMessages((prev) => ({ ...prev, [skill.id]: { kind: 'error', text: message } }));
            } finally {
                setBusyKey(null);
            }
        },
        [loadSkills]
    );

    const saveApiKey = useCallback(async (skill: SkillInfo) => {
        setBusyKey(skill.id);
        setMessages((prev) => {
            const next = { ...prev };
            delete next[skill.id];
            return next;
        });
        try {
            const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: apiKeys[skill.id] || '' })
            });
            const payload = (await response.json().catch(() => ({}))) as {
                success?: boolean;
                message?: string;
                error?: string;
            };
            if (!response.ok || payload.success === false) {
                throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
            }
            setMessages((prev) => ({
                ...prev,
                [skill.id]: { kind: 'success', text: 'API key saved' }
            }));
            await loadSkills();
        } catch (saveError: unknown) {
            const message = saveError instanceof Error ? saveError.message : 'Failed to save API key';
            setMessages((prev) => ({ ...prev, [skill.id]: { kind: 'error', text: message } }));
        } finally {
            setBusyKey(null);
        }
    }, [apiKeys, loadSkills]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-4">
            <section className="rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-[var(--pd-text-main)]">Skills</h1>
                        <p className="text-sm text-[var(--pd-text-muted)]">
                            Bundled, workspace, and plugin skills with runtime enablement and install controls.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                            placeholder="Search skills"
                            className="w-56 rounded border border-[var(--pd-border)] bg-[var(--pd-surface-main)] px-3 py-1.5 text-sm outline-none focus:border-[var(--pd-accent)]"
                        />
                        <button
                            onClick={() => void loadSkills()}
                            disabled={loading}
                            className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] px-3 py-1.5 text-sm hover:bg-[var(--pd-button-hover)] disabled:opacity-60"
                        >
                            {loading ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>
                </div>
                <div className="mt-3 text-xs text-[var(--pd-text-muted)]">{filteredSkills.length} shown</div>
                {error && (
                    <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}
            </section>

            <section className="space-y-3">
                {filteredSkills.length === 0 && !loading ? (
                    <div className="rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-4 text-sm text-[var(--pd-text-muted)]">
                        No skills found.
                    </div>
                ) : (
                    filteredSkills.map((skill) => {
                        const busy = busyKey === skill.id;
                        const blocked = skill.status === 'blocked';
                        const canInstall = Array.isArray(skill.install) && skill.install.length > 0;
                        const msg = messages[skill.id];
                        const enabled = skill.enabled !== false;

                        return (
                            <article
                                key={skill.id}
                                className="rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-4"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-base font-semibold text-[var(--pd-text-main)]">{skill.name}</h2>
                                            <span className="rounded bg-[var(--pd-surface-main)] px-2 py-0.5 text-[11px] text-[var(--pd-text-muted)]">
                                                {sourceLabel(skill.source)}
                                            </span>
                                            <span
                                                className={`rounded px-2 py-0.5 text-[11px] ${
                                                    blocked
                                                        ? 'bg-red-500/15 text-red-300'
                                                        : enabled
                                                            ? 'bg-green-500/15 text-green-300'
                                                            : 'bg-zinc-500/20 text-zinc-300'
                                                }`}
                                            >
                                                {blocked ? 'Blocked' : enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                            <span className="rounded bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-200">
                                                {skill.hasRunner ? 'Executable' : 'Knowledge'}
                                            </span>
                                        </div>
                                        {skill.description && (
                                            <p className="mt-1 text-sm text-[var(--pd-text-muted)]">{skill.description}</p>
                                        )}
                                        {Array.isArray(skill.missingBins) && skill.missingBins.length > 0 && (
                                            <p className="mt-2 text-xs text-amber-300">
                                                Missing: {skill.missingBins.join(', ')}
                                            </p>
                                        )}
                                        {msg && (
                                            <p
                                                className={`mt-2 text-xs ${
                                                    msg.kind === 'error' ? 'text-red-300' : 'text-green-300'
                                                }`}
                                            >
                                                {msg.text}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => void toggleSkill(skill)}
                                            disabled={busy || blocked}
                                            className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-main)] px-3 py-1.5 text-xs hover:bg-[var(--pd-button-hover)] disabled:opacity-60"
                                        >
                                            {enabled ? 'Disable' : 'Enable'}
                                        </button>
                                        {canInstall && (
                                            <button
                                                onClick={() => void installSkill(skill)}
                                                disabled={busy}
                                                className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-main)] px-3 py-1.5 text-xs hover:bg-[var(--pd-button-hover)] disabled:opacity-60"
                                            >
                                                Install deps
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {skill.requiresApiKey && (
                                    <div className="mt-3 border-t border-[var(--pd-border)] pt-3">
                                        <label className="mb-1 block text-xs text-[var(--pd-text-muted)]">API key</label>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <input
                                                type="password"
                                                value={apiKeys[skill.id] ?? ''}
                                                onChange={(event) =>
                                                    setApiKeys((prev) => ({
                                                        ...prev,
                                                        [skill.id]: event.target.value
                                                    }))
                                                }
                                                className="w-full rounded border border-[var(--pd-border)] bg-[var(--pd-surface-main)] px-3 py-1.5 text-xs font-mono outline-none focus:border-[var(--pd-accent)]"
                                            />
                                            <button
                                                onClick={() => void saveApiKey(skill)}
                                                disabled={busy}
                                                className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-main)] px-3 py-1.5 text-xs hover:bg-[var(--pd-button-hover)] disabled:opacity-60"
                                            >
                                                Save key
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </article>
                        );
                    })
                )}
            </section>
        </div>
    );
}
