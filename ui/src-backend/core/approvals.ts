// @ts-nocheck
import { randomUUID } from 'node:crypto';

export type ExecApprovalForwardingMode = 'session' | 'targets' | 'both';

export interface ExecApprovalForwardTarget {
    channel: string;
    to: string;
    accountId?: string;
    threadId?: string | number;
}

export interface ExecApprovalForwardingConfig {
    enabled?: boolean;
    mode?: ExecApprovalForwardingMode;
    agentFilter?: string[];
    sessionFilter?: string[];
    targets?: ExecApprovalForwardTarget[];
}

export interface ApprovalsConfig {
    exec?: ExecApprovalForwardingConfig;
}

export interface ApprovalRequest {
    operation: string;
    detail: string;
    agentId?: string;
    senderId?: string;
    sessionId?: string;
}

interface PendingApproval {
    id: string;
    fingerprint: string;
    operation: string;
    detail: string;
    senderId: string;
    agentId: string;
    sessionId: string;
    status: 'pending' | 'approved';
    createdAt: number;
    expiresAt: number;
}

export interface ApprovalDecision {
    allowed: boolean;
    reason?: string;
    approvalId?: string;
}

type SessionMatcher = {
    raw: string;
    regex?: RegExp;
    needle?: string;
};

const DEFAULT_APPROVAL_TIMEOUT_MS = 60_000;

function normalizeString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeMode(value: unknown): ExecApprovalForwardingMode {
    if (value === 'targets' || value === 'both' || value === 'session') return value;
    return 'session';
}

export class ApprovalsManager {
    private readonly enabled: boolean;
    private readonly mode: ExecApprovalForwardingMode;
    private readonly timeoutMs: number;
    private readonly agentFilter: Set<string> | null;
    private readonly sessionFilters: SessionMatcher[];
    private readonly sessionFilterRaw: string[];
    private readonly targets: ExecApprovalForwardTarget[];
    private readonly pending = new Map<string, PendingApproval>();

    constructor(config: ApprovalsConfig = {}) {
        const exec = config.exec || {};
        this.enabled = exec.enabled === true;
        this.mode = normalizeMode(exec.mode);
        this.timeoutMs = DEFAULT_APPROVAL_TIMEOUT_MS;
        this.agentFilter = this.normalizeAgentFilter(exec.agentFilter || []);

        const normalizedSessionFilters = this.normalizeSessionFilters(exec.sessionFilter || []);
        this.sessionFilters = normalizedSessionFilters.matchers;
        this.sessionFilterRaw = normalizedSessionFilters.raw;
        this.targets = this.normalizeTargets(exec.targets || []);
    }

    public evaluate(request: ApprovalRequest): ApprovalDecision {
        this.purgeExpired();

        if (!this.enabled) {
            return { allowed: true };
        }

        const operation = normalizeString(request.operation).toLowerCase();
        const detail = normalizeString(request.detail);
        const agentId = normalizeString(request.agentId).toLowerCase() || 'default';
        const senderId = normalizeString(request.senderId) || 'unknown';
        const sessionId = normalizeString(request.sessionId);

        if (this.agentFilter && !this.agentFilter.has(agentId)) {
            return { allowed: true };
        }

        if (this.sessionFilters.length > 0 && !this.matchesSessionFilters(sessionId)) {
            return { allowed: true };
        }

        const fingerprint = this.fingerprint(operation, detail, agentId, senderId, sessionId || 'none');

        const approved = this.findMatching(fingerprint, 'approved');
        if (approved) {
            this.pending.delete(approved.id);
            return { allowed: true };
        }

        const existingPending = this.findMatching(fingerprint, 'pending');
        if (existingPending) {
            return {
                allowed: false,
                approvalId: existingPending.id,
                reason: `Approval required. Run /approve ${existingPending.id} then retry.`
            };
        }

        const id = randomUUID().slice(0, 8);
        this.pending.set(id, {
            id,
            fingerprint,
            operation,
            detail,
            senderId,
            agentId,
            sessionId: sessionId || 'none',
            status: 'pending',
            createdAt: Date.now(),
            expiresAt: Date.now() + this.timeoutMs
        });
        return {
            allowed: false,
            approvalId: id,
            reason: `Approval required. Run /approve ${id} then retry.`
        };
    }

    public approve(approvalId: string, senderId?: string): { ok: boolean; message: string } {
        this.purgeExpired();
        const id = normalizeString(approvalId);
        if (!id) {
            return { ok: false, message: 'Approval id is required.' };
        }
        const item = this.pending.get(id);
        if (!item) {
            return { ok: false, message: `Approval "${id}" not found or expired.` };
        }

        const normalizedSender = normalizeString(senderId);
        if (normalizedSender && item.senderId !== normalizedSender) {
            return { ok: false, message: `Approval "${id}" belongs to a different sender.` };
        }

        item.status = 'approved';
        item.expiresAt = Date.now() + this.timeoutMs;
        this.pending.set(id, item);
        return { ok: true, message: `Approval "${id}" granted. Re-run the command before timeout.` };
    }

    public listPending(senderId?: string): PendingApproval[] {
        this.purgeExpired();
        const filterSender = normalizeString(senderId);
        const values = Array.from(this.pending.values());
        return values
            .filter((item) => {
                if (!filterSender) return true;
                return item.senderId === filterSender;
            })
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((item) => ({ ...item }));
    }

    public getExecConfigSnapshot(): {
        enabled: boolean;
        mode: ExecApprovalForwardingMode;
        agentFilter: string[];
        sessionFilter: string[];
        targets: ExecApprovalForwardTarget[];
    } {
        return {
            enabled: this.enabled,
            mode: this.mode,
            agentFilter: this.agentFilter ? Array.from(this.agentFilter) : [],
            sessionFilter: [...this.sessionFilterRaw],
            targets: this.targets.map((target) => ({ ...target }))
        };
    }

    private normalizeAgentFilter(raw: string[]): Set<string> | null {
        const values = (raw || [])
            .map((value) => normalizeString(value).toLowerCase())
            .filter((value) => value.length > 0);
        return values.length > 0 ? new Set(values) : null;
    }

    private normalizeSessionFilters(raw: string[]): { matchers: SessionMatcher[]; raw: string[] } {
        const matchers: SessionMatcher[] = [];
        const normalizedRaw: string[] = [];
        for (const value of raw || []) {
            const trimmed = normalizeString(value);
            if (!trimmed) continue;
            try {
                matchers.push({ raw: trimmed, regex: new RegExp(trimmed, 'i') });
            } catch {
                matchers.push({ raw: trimmed, needle: trimmed.toLowerCase() });
            }
            normalizedRaw.push(trimmed);
        }
        return { matchers, raw: normalizedRaw };
    }

    private normalizeTargets(raw: ExecApprovalForwardTarget[]): ExecApprovalForwardTarget[] {
        const out: ExecApprovalForwardTarget[] = [];
        for (const entry of raw || []) {
            const channel = normalizeString(entry?.channel);
            const to = normalizeString(entry?.to);
            if (!channel || !to) continue;
            const next: ExecApprovalForwardTarget = { channel, to };
            const accountId = normalizeString(entry?.accountId);
            if (accountId) next.accountId = accountId;
            if (typeof entry?.threadId === 'string' || typeof entry?.threadId === 'number') {
                next.threadId = entry.threadId;
            }
            out.push(next);
        }
        return out;
    }

    private matchesSessionFilters(sessionId: string): boolean {
        if (!sessionId) return false;
        const lowered = sessionId.toLowerCase();
        for (const matcher of this.sessionFilters) {
            if (matcher.regex && matcher.regex.test(sessionId)) return true;
            if (matcher.needle && lowered.includes(matcher.needle)) return true;
        }
        return false;
    }

    private findMatching(fingerprint: string, status: 'pending' | 'approved'): PendingApproval | null {
        for (const item of this.pending.values()) {
            if (item.fingerprint === fingerprint && item.status === status) {
                return item;
            }
        }
        return null;
    }

    private fingerprint(operation: string, detail: string, agentId: string, senderId: string, sessionId: string): string {
        return `${operation}|${detail}|${agentId}|${senderId}|${sessionId}|${this.mode}`;
    }

    private purgeExpired(): void {
        const now = Date.now();
        for (const [id, item] of this.pending.entries()) {
            if (item.expiresAt <= now) {
                this.pending.delete(id);
            }
        }
    }
}
