'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type ListedNode = {
    nodeId: string;
    displayName?: string;
    platform?: string;
    version?: string;
    coreVersion?: string;
    uiVersion?: string;
    deviceFamily?: string;
    modelIdentifier?: string;
    remoteIp?: string;
    caps?: string[];
    commands?: string[];
    pathEnv?: string[];
    permissions?: string[];
    connectedAtMs?: number;
    paired?: boolean;
    connected?: boolean;
};

type DeviceTokenSummary = {
    role: string;
    scopes?: string[];
    createdAtMs?: number;
    rotatedAtMs?: number;
    revokedAtMs?: number;
    lastUsedAtMs?: number;
};

type PendingDevice = {
    requestId: string;
    deviceId: string;
    displayName?: string;
    role?: string;
    remoteIp?: string;
    isRepair?: boolean;
    ts?: number;
};

type PairedDevice = {
    deviceId: string;
    displayName?: string;
    roles?: string[];
    scopes?: string[];
    remoteIp?: string;
    tokens?: DeviceTokenSummary[];
    createdAtMs?: number;
    approvedAtMs?: number;
};

type DevicePairingList = {
    pending: PendingDevice[];
    paired: PairedDevice[];
};

type ExecApprovalsDefaults = {
    security?: string;
    ask?: string;
    askFallback?: string;
    autoAllowSkills?: boolean;
};

type ExecApprovalsAllowlistEntry = {
    id?: string;
    pattern: string;
    lastUsedAt?: number;
    lastUsedCommand?: string;
    lastResolvedPath?: string;
};

type ExecApprovalsAgent = ExecApprovalsDefaults & {
    allowlist?: ExecApprovalsAllowlistEntry[];
};

type ExecApprovalsFile = {
    version?: number;
    socket?: { path?: string };
    defaults?: ExecApprovalsDefaults;
    agents?: Record<string, ExecApprovalsAgent>;
};

type ExecApprovalsSnapshot = {
    path: string;
    exists: boolean;
    hash: string;
    file: ExecApprovalsFile;
};

type BindingNode = {
    id: string;
    label: string;
};

type BindingAgent = {
    id: string;
    name?: string;
    index: number;
    isDefault: boolean;
    binding?: string | null;
};

const EXEC_DEFAULT_SCOPE = '__defaults__';

function cloneObject<T>(value: T): T {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

function setPathValue(target: Record<string, unknown> | unknown[], path: Array<string | number>, value: unknown) {
    if (path.length === 0) return;
    let current: Record<string, unknown> | unknown[] = target;
    for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        const nextKey = path[i + 1];
        if (typeof key === 'number') {
            if (!Array.isArray(current)) return;
            if (current[key] == null) {
                current[key] = typeof nextKey === 'number' ? [] : {};
            }
            current = current[key] as Record<string, unknown> | unknown[];
            continue;
        }
        if (!current || typeof current !== 'object') return;
        const record = current as Record<string, unknown>;
        if (record[key] == null) {
            record[key] = typeof nextKey === 'number' ? [] : {};
        }
        current = record[key] as Record<string, unknown> | unknown[];
    }

    const last = path[path.length - 1];
    if (typeof last === 'number') {
        if (Array.isArray(current)) {
            current[last] = value;
        }
        return;
    }
    if (current && typeof current === 'object') {
        (current as Record<string, unknown>)[last] = value;
    }
}

function removePathValue(target: Record<string, unknown> | unknown[], path: Array<string | number>) {
    if (path.length === 0) return;
    let current: Record<string, unknown> | unknown[] = target;
    for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        if (typeof key === 'number') {
            if (!Array.isArray(current)) return;
            current = current[key] as Record<string, unknown> | unknown[];
        } else {
            if (!current || typeof current !== 'object') return;
            current = (current as Record<string, unknown>)[key] as Record<string, unknown> | unknown[];
        }
        if (current == null) return;
    }

    const last = path[path.length - 1];
    if (typeof last === 'number') {
        if (Array.isArray(current)) {
            current.splice(last, 1);
        }
        return;
    }
    if (current && typeof current === 'object') {
        delete (current as Record<string, unknown>)[last];
    }
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, init);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : `Request failed (${response.status})`);
    }
    return json as T;
}

function formatRelativeTimestamp(value?: number | null): string {
    if (!value || !Number.isFinite(value)) return 'n/a';
    const diff = Date.now() - value;
    if (diff < 10000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

function formatList(values?: string[]): string {
    if (!Array.isArray(values) || values.length === 0) return '-';
    return values.join(', ');
}

function normalizeSecurity(value: unknown): 'deny' | 'allowlist' | 'full' {
    if (value === 'deny' || value === 'allowlist' || value === 'full') return value;
    return 'deny';
}

function normalizeAsk(value: unknown): 'off' | 'on-miss' | 'always' {
    if (value === 'off' || value === 'on-miss' || value === 'always') return value;
    return 'on-miss';
}

function resolveExecBindingNodes(nodes: ListedNode[]): BindingNode[] {
    const out: BindingNode[] = [];
    for (const node of nodes) {
        const commands = Array.isArray(node.commands) ? node.commands : [];
        if (!commands.includes('system.run')) continue;
        const nodeId = (node.nodeId || '').trim();
        if (!nodeId) continue;
        const name = (node.displayName || '').trim() || nodeId;
        out.push({
            id: nodeId,
            label: name === nodeId ? nodeId : `${name} · ${nodeId}`
        });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
}

function resolveExecApprovalsNodes(nodes: ListedNode[]): BindingNode[] {
    const out: BindingNode[] = [];
    for (const node of nodes) {
        const commands = Array.isArray(node.commands) ? node.commands : [];
        if (!commands.includes('system.execApprovals.get') && !commands.includes('system.execApprovals.set')) {
            continue;
        }
        const nodeId = (node.nodeId || '').trim();
        if (!nodeId) continue;
        const name = (node.displayName || '').trim() || nodeId;
        out.push({
            id: nodeId,
            label: name === nodeId ? nodeId : `${name} · ${nodeId}`
        });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
}

function resolveBindingAgents(agentsSection: Record<string, any> | null): BindingAgent[] {
    const fallback: BindingAgent = { id: 'main', index: 0, isDefault: true, binding: null };
    if (!agentsSection || typeof agentsSection !== 'object') {
        return [fallback];
    }

    const list = Array.isArray(agentsSection.list) ? agentsSection.list : [];
    const agents: BindingAgent[] = [];

    list.forEach((entry: any, index: number) => {
        if (!entry || typeof entry !== 'object') return;
        const id = typeof entry.id === 'string' ? entry.id.trim() : '';
        if (!id) return;
        const name = typeof entry.name === 'string' ? entry.name.trim() : undefined;
        const isDefault = entry.default === true;
        const binding = typeof entry?.tools?.exec?.node === 'string' && entry.tools.exec.node.trim()
            ? entry.tools.exec.node.trim()
            : null;
        agents.push({ id, name, index, isDefault, binding });
    });

    if (agents.length === 0) {
        return [fallback];
    }
    return agents;
}

function resolveExecApprovalAgents(
    agentsSection: Record<string, any> | null,
    execForm: ExecApprovalsFile | null
): Array<{ id: string; name?: string; isDefault?: boolean }> {
    const merged = new Map<string, { id: string; name?: string; isDefault?: boolean }>();
    for (const agent of resolveBindingAgents(agentsSection)) {
        merged.set(agent.id, { id: agent.id, name: agent.name, isDefault: agent.isDefault });
    }
    for (const id of Object.keys(execForm?.agents || {})) {
        if (!merged.has(id)) {
            merged.set(id, { id });
        }
    }

    const values = [...merged.values()];
    if (values.length === 0) {
        values.push({ id: 'main', isDefault: true });
    }

    values.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        const aLabel = a.name?.trim() || a.id;
        const bLabel = b.name?.trim() || b.id;
        return aLabel.localeCompare(bLabel);
    });

    return values;
}

export default function NodesPage() {
    const [nodesLoading, setNodesLoading] = useState(false);
    const [nodes, setNodes] = useState<ListedNode[]>([]);

    const [devicesLoading, setDevicesLoading] = useState(false);
    const [devicesError, setDevicesError] = useState<string | null>(null);
    const [devicesList, setDevicesList] = useState<DevicePairingList>({ pending: [], paired: [] });

    const [toolsSection, setToolsSection] = useState<Record<string, any> | null>(null);
    const [agentsSection, setAgentsSection] = useState<Record<string, any> | null>(null);
    const [bindingLoading, setBindingLoading] = useState(false);
    const [bindingSaving, setBindingSaving] = useState(false);
    const [bindingBaseline, setBindingBaseline] = useState<{ tools: string; agents: string } | null>(null);

    const [execApprovalsLoading, setExecApprovalsLoading] = useState(false);
    const [execApprovalsSaving, setExecApprovalsSaving] = useState(false);
    const [execApprovalsSnapshot, setExecApprovalsSnapshot] = useState<ExecApprovalsSnapshot | null>(null);
    const [execApprovalsForm, setExecApprovalsForm] = useState<ExecApprovalsFile | null>(null);
    const [execApprovalsDirty, setExecApprovalsDirty] = useState(false);
    const [execApprovalsSelectedScope, setExecApprovalsSelectedScope] = useState<string>(EXEC_DEFAULT_SCOPE);
    const [execApprovalsTarget, setExecApprovalsTarget] = useState<'gateway' | 'node'>('gateway');
    const [execApprovalsTargetNodeId, setExecApprovalsTargetNodeId] = useState<string | null>(null);

    const [lastError, setLastError] = useState<string | null>(null);

    const execBindingNodes = useMemo(() => resolveExecBindingNodes(nodes), [nodes]);
    const execApprovalsNodes = useMemo(() => resolveExecApprovalsNodes(nodes), [nodes]);

    const bindingAgents = useMemo(() => resolveBindingAgents(agentsSection), [agentsSection]);
    const defaultBinding = useMemo(() => {
        const value = toolsSection?.exec?.node;
        return typeof value === 'string' && value.trim() ? value.trim() : null;
    }, [toolsSection]);

    const bindingDirty = useMemo(() => {
        if (!bindingBaseline || !toolsSection || !agentsSection) return false;
        return JSON.stringify(toolsSection) !== bindingBaseline.tools
            || JSON.stringify(agentsSection) !== bindingBaseline.agents;
    }, [bindingBaseline, toolsSection, agentsSection]);

    const execAgents = useMemo(
        () => resolveExecApprovalAgents(agentsSection, execApprovalsForm),
        [agentsSection, execApprovalsForm]
    );

    const selectedExecAgent = useMemo(() => {
        if (execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE) return null;
        return (execApprovalsForm?.agents || {})[execApprovalsSelectedScope] || null;
    }, [execApprovalsForm, execApprovalsSelectedScope]);

    const loadNodes = useCallback(async (quiet: boolean = false) => {
        if (!quiet) setNodesLoading(true);
        try {
            const data = await requestJson<{ nodes?: ListedNode[] }>('/api/nodes');
            setNodes(Array.isArray(data.nodes) ? data.nodes : []);
        } catch (error: any) {
            if (!quiet) setLastError(error.message || 'Failed to load nodes');
        } finally {
            if (!quiet) setNodesLoading(false);
        }
    }, []);

    const loadDevices = useCallback(async (quiet: boolean = false) => {
        if (!quiet) {
            setDevicesLoading(true);
            setDevicesError(null);
        }
        try {
            const data = await requestJson<{ pending?: PendingDevice[]; paired?: PairedDevice[] }>('/api/nodes/devices');
            setDevicesList({
                pending: Array.isArray(data.pending) ? data.pending : [],
                paired: Array.isArray(data.paired) ? data.paired : []
            });
        } catch (error: any) {
            if (!quiet) setDevicesError(error.message || 'Failed to load devices');
        } finally {
            if (!quiet) setDevicesLoading(false);
        }
    }, []);

    const loadBindings = useCallback(async () => {
        setBindingLoading(true);
        setLastError(null);
        try {
            const [toolsData, agentsData] = await Promise.all([
                requestJson<{ data?: Record<string, any> }>('/api/config/tools'),
                requestJson<{ data?: Record<string, any> }>('/api/config/agents')
            ]);

            const nextTools = toolsData.data || {};
            const nextAgents = agentsData.data || {};
            setToolsSection(nextTools);
            setAgentsSection(nextAgents);
            setBindingBaseline({
                tools: JSON.stringify(nextTools),
                agents: JSON.stringify(nextAgents)
            });
        } catch (error: any) {
            setLastError(error.message || 'Failed to load binding config');
        } finally {
            setBindingLoading(false);
        }
    }, []);

    const loadExecApprovals = useCallback(async () => {
        setExecApprovalsLoading(true);
        setLastError(null);
        try {
            const query = new URLSearchParams();
            query.set('target', execApprovalsTarget);
            if (execApprovalsTarget === 'node' && execApprovalsTargetNodeId) {
                query.set('nodeId', execApprovalsTargetNodeId);
            }

            if (execApprovalsTarget === 'node' && !execApprovalsTargetNodeId) {
                throw new Error('Select a node before loading node exec approvals.');
            }

            const snapshot = await requestJson<ExecApprovalsSnapshot>(`/api/nodes/exec-approvals?${query.toString()}`);
            setExecApprovalsSnapshot(snapshot);
            if (!execApprovalsDirty) {
                setExecApprovalsForm(cloneObject(snapshot.file || {}));
            }
        } catch (error: any) {
            setLastError(error.message || 'Failed to load exec approvals');
        } finally {
            setExecApprovalsLoading(false);
        }
    }, [execApprovalsTarget, execApprovalsTargetNodeId, execApprovalsDirty]);

    useEffect(() => {
        loadNodes();
        loadDevices();
        loadBindings();
    }, [loadBindings, loadDevices, loadNodes]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            loadNodes(true);
            loadDevices(true);
        }, 10000);
        return () => window.clearInterval(interval);
    }, [loadDevices, loadNodes]);

    useEffect(() => {
        if (execApprovalsTarget === 'node') {
            if (execApprovalsTargetNodeId && !execApprovalsNodes.some((node) => node.id === execApprovalsTargetNodeId)) {
                setExecApprovalsTargetNodeId(execApprovalsNodes[0]?.id || null);
            }
        }
    }, [execApprovalsNodes, execApprovalsTarget, execApprovalsTargetNodeId]);

    useEffect(() => {
        if (execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE) return;
        if (!execAgents.some((agent) => agent.id === execApprovalsSelectedScope)) {
            setExecApprovalsSelectedScope(EXEC_DEFAULT_SCOPE);
        }
    }, [execAgents, execApprovalsSelectedScope]);

    const updateToolsBinding = useCallback((nodeId: string | null) => {
        setToolsSection((prev) => {
            const next = cloneObject(prev || {});
            if (!next.exec || typeof next.exec !== 'object') {
                next.exec = {};
            }
            if (nodeId) {
                (next.exec as Record<string, unknown>).node = nodeId;
            } else {
                delete (next.exec as Record<string, unknown>).node;
            }
            return next;
        });
    }, []);

    const updateAgentBinding = useCallback((agentIndex: number, nodeId: string | null) => {
        setAgentsSection((prev) => {
            const next = cloneObject(prev || {});
            if (!Array.isArray(next.list)) {
                next.list = [];
            }
            const list = next.list as any[];
            if (!list[agentIndex] || typeof list[agentIndex] !== 'object') {
                return next;
            }
            if (!list[agentIndex].tools || typeof list[agentIndex].tools !== 'object') {
                list[agentIndex].tools = {};
            }
            if (!list[agentIndex].tools.exec || typeof list[agentIndex].tools.exec !== 'object') {
                list[agentIndex].tools.exec = {};
            }
            if (nodeId) {
                list[agentIndex].tools.exec.node = nodeId;
            } else {
                delete list[agentIndex].tools.exec.node;
            }
            return next;
        });
    }, []);

    const saveBindings = useCallback(async () => {
        if (!toolsSection || !agentsSection) {
            setLastError('Load config first.');
            return;
        }
        setBindingSaving(true);
        setLastError(null);
        try {
            await requestJson('/api/config/tools', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toolsSection)
            });
            await requestJson('/api/config/agents', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agentsSection)
            });
            setBindingBaseline({
                tools: JSON.stringify(toolsSection),
                agents: JSON.stringify(agentsSection)
            });
        } catch (error: any) {
            setLastError(error.message || 'Failed to save bindings');
        } finally {
            setBindingSaving(false);
        }
    }, [agentsSection, toolsSection]);

    const setExecTarget = useCallback((kind: 'gateway' | 'node', nodeId: string | null) => {
        setExecApprovalsTarget(kind);
        setExecApprovalsTargetNodeId(kind === 'node' ? nodeId : null);
        setExecApprovalsSnapshot(null);
        setExecApprovalsForm(null);
        setExecApprovalsDirty(false);
    }, []);

    const updateExecFormPath = useCallback((path: Array<string | number>, value: unknown) => {
        setExecApprovalsForm((prev) => {
            const next = cloneObject(prev || {});
            setPathValue(next as Record<string, unknown>, path, value);
            return next;
        });
        setExecApprovalsDirty(true);
    }, []);

    const removeExecFormPath = useCallback((path: Array<string | number>) => {
        setExecApprovalsForm((prev) => {
            const next = cloneObject(prev || {});
            removePathValue(next as Record<string, unknown>, path);
            return next;
        });
        setExecApprovalsDirty(true);
    }, []);

    const saveExecApprovals = useCallback(async () => {
        if (!execApprovalsForm) {
            setLastError('Load exec approvals first.');
            return;
        }
        if (execApprovalsTarget === 'node' && !execApprovalsTargetNodeId) {
            setLastError('Select a node before saving node exec approvals.');
            return;
        }

        setExecApprovalsSaving(true);
        setLastError(null);
        try {
            const snapshot = await requestJson<ExecApprovalsSnapshot>('/api/nodes/exec-approvals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: execApprovalsTarget,
                    nodeId: execApprovalsTarget === 'node' ? execApprovalsTargetNodeId : undefined,
                    baseHash: execApprovalsSnapshot?.hash || '',
                    file: execApprovalsForm
                })
            });
            setExecApprovalsSnapshot(snapshot);
            setExecApprovalsForm(cloneObject(snapshot.file || {}));
            setExecApprovalsDirty(false);
        } catch (error: any) {
            setLastError(error.message || 'Failed to save exec approvals');
        } finally {
            setExecApprovalsSaving(false);
        }
    }, [execApprovalsForm, execApprovalsSnapshot?.hash, execApprovalsTarget, execApprovalsTargetNodeId]);

    const handleApproveDevice = useCallback(async (requestId: string) => {
        try {
            await requestJson('/api/nodes/devices/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });
            await Promise.all([loadDevices(), loadNodes()]);
        } catch (error: any) {
            setDevicesError(error.message || 'Failed to approve request');
        }
    }, [loadDevices, loadNodes]);

    const handleRejectDevice = useCallback(async (requestId: string) => {
        const confirmed = window.confirm('Reject this pairing request?');
        if (!confirmed) return;
        try {
            await requestJson('/api/nodes/devices/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });
            await Promise.all([loadDevices(), loadNodes()]);
        } catch (error: any) {
            setDevicesError(error.message || 'Failed to reject request');
        }
    }, [loadDevices, loadNodes]);

    const handleRotateToken = useCallback(async (deviceId: string, role: string, scopes?: string[]) => {
        try {
            const response = await requestJson<{ token?: string }>('/api/nodes/devices/token/rotate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, role, scopes })
            });
            if (response.token) {
                window.prompt('New device token (copy and store securely):', response.token);
            }
            await loadDevices();
        } catch (error: any) {
            setDevicesError(error.message || 'Failed to rotate token');
        }
    }, [loadDevices]);

    const handleRevokeToken = useCallback(async (deviceId: string, role: string) => {
        const confirmed = window.confirm(`Revoke token for ${deviceId} (${role})?`);
        if (!confirmed) return;
        try {
            await requestJson('/api/nodes/devices/token/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, role })
            });
            await loadDevices();
        } catch (error: any) {
            setDevicesError(error.message || 'Failed to revoke token');
        }
    }, [loadDevices]);

    const execDefaults = useMemo(() => {
        const defaults = execApprovalsForm?.defaults || {};
        return {
            security: normalizeSecurity(defaults.security),
            ask: normalizeAsk(defaults.ask),
            askFallback: normalizeSecurity(defaults.askFallback || 'deny'),
            autoAllowSkills: Boolean(defaults.autoAllowSkills)
        };
    }, [execApprovalsForm]);

    const selectedAllowlist = useMemo(() => {
        if (execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE) return [] as ExecApprovalsAllowlistEntry[];
        const agent = (execApprovalsForm?.agents || {})[execApprovalsSelectedScope];
        if (!agent || !Array.isArray(agent.allowlist)) return [];
        return agent.allowlist;
    }, [execApprovalsForm, execApprovalsSelectedScope]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="mb-2 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--pd-text-main)] mb-1">Nodes</h1>
                    <p className="text-[13px] text-[var(--pd-text-muted)]">Paired devices and live links.</p>
                </div>
                <Link href="/config/nodeHost" className="text-sm px-3 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded transition-colors">
                    Configure Host
                </Link>
            </div>

            {lastError && (
                <div className="px-4 py-3 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
                    {lastError}
                </div>
            )}

            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Exec approvals</h2>
                        <p className="text-[13px] text-[var(--pd-text-muted)]">Allowlist and approval policy for <code className="font-mono">exec host=gateway/node</code>.</p>
                    </div>
                    <button
                        onClick={saveExecApprovals}
                        disabled={execApprovalsSaving || !execApprovalsDirty || (execApprovalsTarget === 'node' && !execApprovalsTargetNodeId)}
                        className="px-4 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px] font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                        {execApprovalsSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                <div className="space-y-3 mt-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <label className="text-sm">
                            <div className="text-[12px] mb-1 text-[var(--pd-text-muted)]">Host</div>
                            <select
                                value={execApprovalsTarget}
                                onChange={(event) => {
                                    if (event.target.value === 'node') {
                                        setExecTarget('node', execApprovalsNodes[0]?.id || null);
                                    } else {
                                        setExecTarget('gateway', null);
                                    }
                                }}
                                className="px-3 py-2 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] text-sm"
                            >
                                <option value="gateway">Gateway</option>
                                <option value="node">Node</option>
                            </select>
                        </label>

                        {execApprovalsTarget === 'node' && (
                            <label className="text-sm">
                                <div className="text-[12px] mb-1 text-[var(--pd-text-muted)]">Node</div>
                                <select
                                    value={execApprovalsTargetNodeId || ''}
                                    onChange={(event) => setExecApprovalsTargetNodeId(event.target.value || null)}
                                    disabled={execApprovalsNodes.length === 0}
                                    className="px-3 py-2 rounded bg-[var(--pd-surface-sidebar)] border border-[var(--pd-border)] text-sm disabled:opacity-60"
                                >
                                    <option value="">Select node</option>
                                    {execApprovalsNodes.map((node) => (
                                        <option key={node.id} value={node.id}>{node.label}</option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <button
                            onClick={loadExecApprovals}
                            disabled={execApprovalsLoading || (execApprovalsTarget === 'node' && !execApprovalsTargetNodeId)}
                            className="px-4 py-2 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px] font-medium transition-all disabled:opacity-50"
                        >
                            {execApprovalsLoading ? 'Loading...' : 'Load approvals'}
                        </button>
                    </div>

                    {execApprovalsTarget === 'node' && execApprovalsNodes.length === 0 && (
                        <div className="text-[13px] text-[var(--pd-text-muted)]">No nodes advertise exec approvals yet.</div>
                    )}
                </div>

                {execApprovalsForm && (
                    <div className="space-y-4 mt-5">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setExecApprovalsSelectedScope(EXEC_DEFAULT_SCOPE)}
                                className={`px-3 py-1.5 rounded text-[12px] border ${execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE ? 'bg-[var(--pd-accent)] text-white border-transparent' : 'bg-[var(--pd-surface-sidebar)] border-[var(--pd-border)] text-[var(--pd-text-main)]'}`}
                            >
                                Defaults
                            </button>
                            {execAgents.map((agent) => {
                                const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
                                return (
                                    <button
                                        key={agent.id}
                                        onClick={() => setExecApprovalsSelectedScope(agent.id)}
                                        className={`px-3 py-1.5 rounded text-[12px] border ${execApprovalsSelectedScope === agent.id ? 'bg-[var(--pd-accent)] text-white border-transparent' : 'bg-[var(--pd-surface-sidebar)] border-[var(--pd-border)] text-[var(--pd-text-main)]'}`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                            <div className="rounded border border-[var(--pd-border)] p-3 bg-[var(--pd-surface-sidebar)]">
                                <div className="text-sm font-semibold mb-2">Security</div>
                                <select
                                    value={execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE
                                        ? execDefaults.security
                                        : (typeof selectedExecAgent?.security === 'string' ? selectedExecAgent.security : '__default__')}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        if (execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE) {
                                            updateExecFormPath(['defaults', 'security'], value);
                                            return;
                                        }
                                        if (value === '__default__') {
                                            removeExecFormPath(['agents', execApprovalsSelectedScope, 'security']);
                                        } else {
                                            updateExecFormPath(['agents', execApprovalsSelectedScope, 'security'], value);
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] text-sm"
                                >
                                    {execApprovalsSelectedScope !== EXEC_DEFAULT_SCOPE && (
                                        <option value="__default__">Use default ({execDefaults.security})</option>
                                    )}
                                    <option value="deny">Deny</option>
                                    <option value="allowlist">Allowlist</option>
                                    <option value="full">Full</option>
                                </select>
                            </div>

                            <div className="rounded border border-[var(--pd-border)] p-3 bg-[var(--pd-surface-sidebar)]">
                                <div className="text-sm font-semibold mb-2">Ask</div>
                                <select
                                    value={execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE
                                        ? execDefaults.ask
                                        : (typeof selectedExecAgent?.ask === 'string' ? selectedExecAgent.ask : '__default__')}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        if (execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE) {
                                            updateExecFormPath(['defaults', 'ask'], value);
                                            return;
                                        }
                                        if (value === '__default__') {
                                            removeExecFormPath(['agents', execApprovalsSelectedScope, 'ask']);
                                        } else {
                                            updateExecFormPath(['agents', execApprovalsSelectedScope, 'ask'], value);
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] text-sm"
                                >
                                    {execApprovalsSelectedScope !== EXEC_DEFAULT_SCOPE && (
                                        <option value="__default__">Use default ({execDefaults.ask})</option>
                                    )}
                                    <option value="off">Off</option>
                                    <option value="on-miss">On miss</option>
                                    <option value="always">Always</option>
                                </select>
                            </div>

                            <div className="rounded border border-[var(--pd-border)] p-3 bg-[var(--pd-surface-sidebar)]">
                                <div className="text-sm font-semibold mb-2">Ask fallback</div>
                                <select
                                    value={execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE
                                        ? execDefaults.askFallback
                                        : (typeof selectedExecAgent?.askFallback === 'string' ? selectedExecAgent.askFallback : '__default__')}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        if (execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE) {
                                            updateExecFormPath(['defaults', 'askFallback'], value);
                                            return;
                                        }
                                        if (value === '__default__') {
                                            removeExecFormPath(['agents', execApprovalsSelectedScope, 'askFallback']);
                                        } else {
                                            updateExecFormPath(['agents', execApprovalsSelectedScope, 'askFallback'], value);
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] text-sm"
                                >
                                    {execApprovalsSelectedScope !== EXEC_DEFAULT_SCOPE && (
                                        <option value="__default__">Use default ({execDefaults.askFallback})</option>
                                    )}
                                    <option value="deny">Deny</option>
                                    <option value="allowlist">Allowlist</option>
                                    <option value="full">Full</option>
                                </select>
                            </div>

                            <div className="rounded border border-[var(--pd-border)] p-3 bg-[var(--pd-surface-sidebar)]">
                                <div className="text-sm font-semibold mb-2">Auto-allow skill CLIs</div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE
                                            ? Boolean(execDefaults.autoAllowSkills)
                                            : (typeof selectedExecAgent?.autoAllowSkills === 'boolean'
                                                ? selectedExecAgent.autoAllowSkills
                                                : Boolean(execDefaults.autoAllowSkills))}
                                        onChange={(event) => {
                                            if (execApprovalsSelectedScope === EXEC_DEFAULT_SCOPE) {
                                                updateExecFormPath(['defaults', 'autoAllowSkills'], event.target.checked);
                                                return;
                                            }
                                            updateExecFormPath(['agents', execApprovalsSelectedScope, 'autoAllowSkills'], event.target.checked);
                                        }}
                                    />
                                    {execApprovalsSelectedScope !== EXEC_DEFAULT_SCOPE
                                        && typeof selectedExecAgent?.autoAllowSkills === 'undefined' && (
                                            <span className="text-xs text-[var(--pd-text-muted)]">Using default ({execDefaults.autoAllowSkills ? 'on' : 'off'})</span>
                                        )}
                                    {execApprovalsSelectedScope !== EXEC_DEFAULT_SCOPE
                                        && typeof selectedExecAgent?.autoAllowSkills === 'boolean' && (
                                            <button
                                                onClick={() => removeExecFormPath(['agents', execApprovalsSelectedScope, 'autoAllowSkills'])}
                                                className="px-2 py-1 rounded border border-[var(--pd-border)] text-xs"
                                            >
                                                Use default
                                            </button>
                                        )}
                                </div>
                            </div>
                        </div>

                        {execApprovalsSelectedScope !== EXEC_DEFAULT_SCOPE && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold">Allowlist</h3>
                                        <p className="text-xs text-[var(--pd-text-muted)]">Case-insensitive glob patterns.</p>
                                    </div>
                                    <button
                                        onClick={() => updateExecFormPath(
                                            ['agents', execApprovalsSelectedScope, 'allowlist'],
                                            [...selectedAllowlist, { pattern: '' }]
                                        )}
                                        className="px-3 py-1.5 rounded border border-[var(--pd-border)] text-xs"
                                    >
                                        Add pattern
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {selectedAllowlist.length === 0 && (
                                        <div className="text-sm text-[var(--pd-text-muted)]">No allowlist entries yet.</div>
                                    )}
                                    {selectedAllowlist.map((entry, index) => (
                                        <div key={entry.id || index} className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] p-3">
                                            <div className="text-xs text-[var(--pd-text-muted)] mb-2">
                                                Last used: {formatRelativeTimestamp(entry.lastUsedAt)}
                                            </div>
                                            {entry.lastUsedCommand && (
                                                <div className="text-xs font-mono mb-1 opacity-80">{entry.lastUsedCommand}</div>
                                            )}
                                            {entry.lastResolvedPath && (
                                                <div className="text-xs font-mono mb-2 opacity-80">{entry.lastResolvedPath}</div>
                                            )}
                                            <div className="flex gap-2">
                                                <input
                                                    value={entry.pattern || ''}
                                                    onChange={(event) => updateExecFormPath(
                                                        ['agents', execApprovalsSelectedScope, 'allowlist', index, 'pattern'],
                                                        event.target.value
                                                    )}
                                                    className="flex-1 px-3 py-2 rounded bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] text-sm"
                                                    placeholder="Pattern"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (selectedAllowlist.length <= 1) {
                                                            removeExecFormPath(['agents', execApprovalsSelectedScope, 'allowlist']);
                                                            return;
                                                        }
                                                        removeExecFormPath(['agents', execApprovalsSelectedScope, 'allowlist', index]);
                                                    }}
                                                    className="px-3 py-2 rounded border border-red-500/40 text-red-300 text-xs"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Exec node binding</h2>
                        <p className="text-[13px] text-[var(--pd-text-muted)]">Pin agents to a specific node when using <code className="font-mono">exec host=node</code>.</p>
                    </div>
                    <button
                        onClick={saveBindings}
                        disabled={bindingSaving || !bindingDirty}
                        className="px-4 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px] font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                        {bindingSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {!toolsSection || !agentsSection ? (
                    <div className="mt-4 flex items-center gap-3">
                        <div className="text-sm text-[var(--pd-text-muted)]">Load config to edit bindings.</div>
                        <button
                            onClick={loadBindings}
                            disabled={bindingLoading}
                            className="px-4 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px]"
                        >
                            {bindingLoading ? 'Loading...' : 'Load config'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 mt-4">
                        <div className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold">Default binding</div>
                                <div className="text-xs text-[var(--pd-text-muted)]">Used when agents do not override a node binding.</div>
                            </div>
                            <label className="text-sm">
                                <div className="text-[12px] mb-1 text-[var(--pd-text-muted)]">Node</div>
                                <select
                                    value={defaultBinding || ''}
                                    onChange={(event) => updateToolsBinding(event.target.value || null)}
                                    disabled={execBindingNodes.length === 0}
                                    className="px-3 py-2 rounded bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] text-sm disabled:opacity-60"
                                >
                                    <option value="">Any node</option>
                                    {execBindingNodes.map((node) => (
                                        <option key={node.id} value={node.id}>{node.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {bindingAgents.length === 0 ? (
                            <div className="text-sm text-[var(--pd-text-muted)]">No agents found.</div>
                        ) : (
                            bindingAgents.map((agent) => {
                                const binding = agent.binding || '__default__';
                                const label = agent.name?.trim() ? `${agent.name} (${agent.id})` : agent.id;
                                return (
                                    <div key={`${agent.id}-${agent.index}`} className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold">{label}</div>
                                            <div className="text-xs text-[var(--pd-text-muted)]">
                                                {agent.isDefault ? 'default agent' : 'agent'} · {binding === '__default__' ? `uses default (${defaultBinding || 'any'})` : `override: ${binding}`}
                                            </div>
                                        </div>
                                        <label className="text-sm">
                                            <div className="text-[12px] mb-1 text-[var(--pd-text-muted)]">Binding</div>
                                            <select
                                                value={binding}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    updateAgentBinding(agent.index, value === '__default__' ? null : value);
                                                }}
                                                disabled={execBindingNodes.length === 0}
                                                className="px-3 py-2 rounded bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] text-sm disabled:opacity-60"
                                            >
                                                <option value="__default__">Use default</option>
                                                {execBindingNodes.map((node) => (
                                                    <option key={node.id} value={node.id}>{node.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </section>

            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Devices</h2>
                        <p className="text-[13px] text-[var(--pd-text-muted)]">Pairing requests + role tokens.</p>
                    </div>
                    <button
                        onClick={() => loadDevices()}
                        disabled={devicesLoading}
                        className="px-4 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px] font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                        {devicesLoading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {devicesError && (
                    <div className="mb-4 px-3 py-2 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
                        {devicesError}
                    </div>
                )}

                <div className="space-y-3">
                    {devicesList.pending.length > 0 && (
                        <>
                            <div className="text-xs uppercase tracking-wider text-[var(--pd-text-muted)]">Pending</div>
                            {devicesList.pending.map((request) => {
                                const name = request.displayName?.trim() || request.deviceId;
                                return (
                                    <div key={request.requestId} className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] p-3 flex flex-col md:flex-row md:justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold">{name}</div>
                                            <div className="text-xs text-[var(--pd-text-muted)]">{request.deviceId}{request.remoteIp ? ` · ${request.remoteIp}` : ''}</div>
                                            <div className="text-xs text-[var(--pd-text-muted)] mt-1">role: {request.role || '-'} · requested {formatRelativeTimestamp(request.ts)}{request.isRepair ? ' · repair' : ''}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApproveDevice(request.requestId)}
                                                className="px-3 py-1.5 rounded bg-[var(--pd-accent)] text-white text-xs font-semibold"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleRejectDevice(request.requestId)}
                                                className="px-3 py-1.5 rounded border border-[var(--pd-border)] text-xs"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {devicesList.paired.length > 0 && (
                        <>
                            <div className="text-xs uppercase tracking-wider text-[var(--pd-text-muted)]">Paired</div>
                            {devicesList.paired.map((device) => {
                                const name = device.displayName?.trim() || device.deviceId;
                                const tokens = Array.isArray(device.tokens) ? device.tokens : [];
                                return (
                                    <div key={device.deviceId} className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] p-3 space-y-3">
                                        <div>
                                            <div className="text-sm font-semibold">{name}</div>
                                            <div className="text-xs text-[var(--pd-text-muted)]">{device.deviceId}{device.remoteIp ? ` · ${device.remoteIp}` : ''}</div>
                                            <div className="text-xs text-[var(--pd-text-muted)] mt-1">roles: {formatList(device.roles)} · scopes: {formatList(device.scopes)}</div>
                                        </div>

                                        {tokens.length === 0 ? (
                                            <div className="text-xs text-[var(--pd-text-muted)]">Tokens: none</div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="text-xs text-[var(--pd-text-muted)] uppercase tracking-wide">Tokens</div>
                                                {tokens.map((token) => (
                                                    <div key={`${device.deviceId}-${token.role}`} className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] p-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                        <div className="text-xs text-[var(--pd-text-muted)]">
                                                            {token.role} · {token.revokedAtMs ? 'revoked' : 'active'} · scopes: {formatList(token.scopes)} · {formatRelativeTimestamp(token.rotatedAtMs ?? token.createdAtMs ?? token.lastUsedAtMs ?? null)}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleRotateToken(device.deviceId, token.role, token.scopes)}
                                                                className="px-2 py-1 rounded border border-[var(--pd-border)] text-xs"
                                                            >
                                                                Rotate
                                                            </button>
                                                            {!token.revokedAtMs && (
                                                                <button
                                                                    onClick={() => handleRevokeToken(device.deviceId, token.role)}
                                                                    className="px-2 py-1 rounded border border-red-500/40 text-red-300 text-xs"
                                                                >
                                                                    Revoke
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {devicesList.pending.length === 0 && devicesList.paired.length === 0 && (
                        <div className="text-sm text-[var(--pd-text-muted)]">No paired devices.</div>
                    )}
                </div>
            </section>

            <section className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)]">Nodes</h2>
                        <p className="text-[13px] text-[var(--pd-text-muted)]">Paired devices and live links.</p>
                    </div>
                    <button
                        onClick={() => loadNodes()}
                        disabled={nodesLoading}
                        className="px-4 py-1.5 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded text-[13px] font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                        {nodesLoading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                <div className="space-y-3">
                    {nodes.length === 0 && (
                        <div className="text-sm text-[var(--pd-text-muted)]">No nodes found.</div>
                    )}
                    {nodes.map((node) => {
                        const title = node.displayName?.trim() || node.nodeId;
                        return (
                            <div key={node.nodeId} className="rounded border border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)] p-3">
                                <div className="text-sm font-semibold">{title}</div>
                                <div className="text-xs text-[var(--pd-text-muted)] mt-1">
                                    {node.nodeId}
                                    {node.remoteIp ? ` · ${node.remoteIp}` : ''}
                                    {node.version ? ` · ${node.version}` : ''}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    <span className="px-2 py-0.5 rounded-full border border-[var(--pd-border)] text-[11px]">{node.paired ? 'paired' : 'unpaired'}</span>
                                    <span className={`px-2 py-0.5 rounded-full border text-[11px] ${node.connected ? 'border-green-400/40 text-green-300' : 'border-amber-400/40 text-amber-300'}`}>
                                        {node.connected ? 'connected' : 'offline'}
                                    </span>
                                    {(Array.isArray(node.caps) ? node.caps : []).slice(0, 12).map((cap) => (
                                        <span key={`${node.nodeId}-cap-${cap}`} className="px-2 py-0.5 rounded-full border border-[var(--pd-border)] text-[11px]">{cap}</span>
                                    ))}
                                    {(Array.isArray(node.commands) ? node.commands : []).slice(0, 8).map((command) => (
                                        <span key={`${node.nodeId}-cmd-${command}`} className="px-2 py-0.5 rounded-full border border-[var(--pd-border)] text-[11px]">{command}</span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
