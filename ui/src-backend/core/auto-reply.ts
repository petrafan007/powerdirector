// @ts-nocheck
import type { ChannelMessage } from '../channels/base.ts';

export type AutoReplyMode = 'rules' | 'away';
export type AutoReplyMatchMode = 'contains' | 'exact' | 'regex';

export interface AutoReplyRuleConfig {
    id?: string;
    enabled?: boolean;
    channels?: string[];
    senders?: string[];
    match?: AutoReplyMatchMode;
    pattern: string;
    response: string;
    caseSensitive?: boolean;
    continueToAgent?: boolean;
    cooldownSeconds?: number;
}

export interface AutoReplyConfig {
    enabled?: boolean;
    mode?: AutoReplyMode;
    awayMessage?: string;
    awayContinueToAgent?: boolean;
    delayMs?: number;
    cooldownSeconds?: number;
    rules?: AutoReplyRuleConfig[];
}

export interface AutoReplyEvaluationInput {
    message: ChannelMessage;
    recipientId: string;
}

export interface AutoReplyEvaluationOptions {
    dryRun?: boolean;
}

export interface AutoReplyDecision {
    matched: boolean;
    response?: string;
    blockAgent: boolean;
    delayMs: number;
    mode?: AutoReplyMode;
    ruleId?: string;
    reason?: string;
}

interface NormalizedAutoReplyRule {
    id: string;
    enabled: boolean;
    channels: string[];
    senders: string[];
    match: AutoReplyMatchMode;
    pattern: string;
    response: string;
    caseSensitive: boolean;
    continueToAgent: boolean;
    cooldownSeconds: number;
}

interface NormalizedAutoReplyConfig {
    enabled: boolean;
    mode: AutoReplyMode;
    awayMessage: string;
    awayContinueToAgent: boolean;
    delayMs: number;
    cooldownSeconds: number;
    rules: NormalizedAutoReplyRule[];
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => String(entry ?? '').trim())
        .filter((entry) => entry.length > 0);
}

function normalizeRule(raw: AutoReplyRuleConfig, index: number): NormalizedAutoReplyRule | null {
    const pattern = String(raw?.pattern || '').trim();
    const response = String(raw?.response || '').trim();
    if (!pattern || !response) return null;

    const match = raw.match === 'exact' || raw.match === 'regex' || raw.match === 'contains'
        ? raw.match
        : 'contains';
    const id = String(raw.id || `rule-${index + 1}`).trim() || `rule-${index + 1}`;
    const cooldownSeconds = typeof raw.cooldownSeconds === 'number' && Number.isFinite(raw.cooldownSeconds)
        ? Math.max(0, Math.round(raw.cooldownSeconds))
        : 0;

    return {
        id,
        enabled: raw.enabled !== false,
        channels: toStringArray(raw.channels),
        senders: toStringArray(raw.senders),
        match,
        pattern,
        response,
        caseSensitive: raw.caseSensitive === true,
        continueToAgent: raw.continueToAgent === true,
        cooldownSeconds
    };
}

function normalizeConfig(raw: AutoReplyConfig = {}): NormalizedAutoReplyConfig {
    const delayMs = typeof raw.delayMs === 'number' && Number.isFinite(raw.delayMs)
        ? Math.max(0, Math.round(raw.delayMs))
        : 0;
    const cooldownSeconds = typeof raw.cooldownSeconds === 'number' && Number.isFinite(raw.cooldownSeconds)
        ? Math.max(0, Math.round(raw.cooldownSeconds))
        : 0;
    const mode: AutoReplyMode = raw.mode === 'away' ? 'away' : 'rules';
    const rules = (Array.isArray(raw.rules) ? raw.rules : [])
        .map((entry, index) => normalizeRule(entry, index))
        .filter((entry): entry is NormalizedAutoReplyRule => Boolean(entry));

    return {
        enabled: raw.enabled === true,
        mode,
        awayMessage: String(raw.awayMessage || 'I am currently away and may not respond immediately.').trim()
            || 'I am currently away and may not respond immediately.',
        awayContinueToAgent: raw.awayContinueToAgent === true,
        delayMs,
        cooldownSeconds,
        rules
    };
}

function isAllowedEntry(allowlist: string[], value: string): boolean {
    if (allowlist.length === 0) return true;
    if (allowlist.includes('*')) return true;
    return allowlist.includes(value);
}

function asComparableValue(value: string, caseSensitive: boolean): string {
    return caseSensitive ? value : value.toLowerCase();
}

function resolveMetadataPath(metadata: any, path: string): unknown {
    if (!metadata || typeof metadata !== 'object') return undefined;
    const parts = path.split('.').filter((part) => part.length > 0);
    let current: any = metadata;
    for (const part of parts) {
        if (!current || typeof current !== 'object' || !(part in current)) {
            return undefined;
        }
        current = current[part];
    }
    return current;
}

export interface AutoReplyStatus {
    configuredEnabled: boolean;
    effectiveEnabled: boolean;
    mode: AutoReplyMode;
    override: 'inherit' | 'on' | 'off';
    totalRules: number;
    activeRules: number;
    awayContinueToAgent: boolean;
}

export class AutoReplyManager {
    private config: NormalizedAutoReplyConfig;
    private enabledOverride: boolean | null = null;
    private readonly cooldowns = new Map<string, number>();

    constructor(config: AutoReplyConfig = {}) {
        this.config = normalizeConfig(config);
    }

    public updateConfig(config: AutoReplyConfig = {}): void {
        this.config = normalizeConfig(config);
        this.cooldowns.clear();
    }

    public setEnabledOverride(value: boolean | null): void {
        this.enabledOverride = value;
    }

    public getStatus(): AutoReplyStatus {
        const configuredEnabled = this.config.enabled;
        const effectiveEnabled = this.isEnabled();
        return {
            configuredEnabled,
            effectiveEnabled,
            mode: this.config.mode,
            override: this.enabledOverride === null
                ? 'inherit'
                : (this.enabledOverride ? 'on' : 'off'),
            totalRules: this.config.rules.length,
            activeRules: this.config.rules.filter((rule) => rule.enabled).length,
            awayContinueToAgent: this.config.awayContinueToAgent
        };
    }

    public evaluate(
        input: AutoReplyEvaluationInput,
        options: AutoReplyEvaluationOptions = {}
    ): AutoReplyDecision {
        if (!this.isEnabled()) {
            return {
                matched: false,
                blockAgent: false,
                delayMs: 0,
                reason: 'disabled'
            };
        }

        const message = input.message;
        const senderId = String(message.senderId || '').trim();
        const channelId = String(message.channelId || '').trim();
        const content = String(message.content || '').trim();

        if (!senderId || !channelId) {
            return {
                matched: false,
                blockAgent: false,
                delayMs: 0,
                reason: 'missing-context'
            };
        }

        if (this.config.mode === 'away') {
            const cooldownKey = `away:${channelId}:${senderId}`;
            const blockedByCooldown = this.isCooldownActive(cooldownKey, this.config.cooldownSeconds);
            if (blockedByCooldown) {
                return {
                    matched: true,
                    blockAgent: !this.config.awayContinueToAgent,
                    delayMs: 0,
                    mode: 'away',
                    reason: 'cooldown'
                };
            }

            if (!options.dryRun) {
                this.setCooldown(cooldownKey, this.config.cooldownSeconds);
            }

            return {
                matched: true,
                response: this.renderTemplate(this.config.awayMessage, input),
                blockAgent: !this.config.awayContinueToAgent,
                delayMs: this.config.delayMs,
                mode: 'away'
            };
        }

        if (!content) {
            return {
                matched: false,
                blockAgent: false,
                delayMs: 0,
                reason: 'empty-content'
            };
        }

        for (const rule of this.config.rules) {
            if (!rule.enabled) continue;
            if (!isAllowedEntry(rule.channels, channelId)) continue;
            if (!isAllowedEntry(rule.senders, senderId)) continue;
            if (!this.matchesRule(content, rule)) continue;

            const cooldownKey = `rule:${rule.id}:${channelId}:${senderId}`;
            if (this.isCooldownActive(cooldownKey, rule.cooldownSeconds)) {
                return {
                    matched: true,
                    blockAgent: false,
                    delayMs: 0,
                    mode: 'rules',
                    ruleId: rule.id,
                    reason: 'cooldown'
                };
            }

            if (!options.dryRun) {
                this.setCooldown(cooldownKey, rule.cooldownSeconds);
            }

            return {
                matched: true,
                response: this.renderTemplate(rule.response, input),
                blockAgent: !rule.continueToAgent,
                delayMs: this.config.delayMs,
                mode: 'rules',
                ruleId: rule.id
            };
        }

        return {
            matched: false,
            blockAgent: false,
            delayMs: 0,
            mode: 'rules',
            reason: 'no-match'
        };
    }

    private isEnabled(): boolean {
        if (this.enabledOverride !== null) return this.enabledOverride;
        return this.config.enabled;
    }

    private matchesRule(content: string, rule: NormalizedAutoReplyRule): boolean {
        const source = asComparableValue(content, rule.caseSensitive);
        const pattern = asComparableValue(rule.pattern, rule.caseSensitive);

        if (rule.match === 'exact') {
            return source === pattern;
        }
        if (rule.match === 'contains') {
            return source.includes(pattern);
        }

        try {
            const regex = new RegExp(rule.pattern, rule.caseSensitive ? '' : 'i');
            return regex.test(content);
        } catch {
            return false;
        }
    }

    private renderTemplate(template: string, input: AutoReplyEvaluationInput): string {
        const message = input.message;
        const replacements: Record<string, string> = {
            senderId: String(message.senderId || ''),
            channelId: String(message.channelId || ''),
            recipientId: String(input.recipientId || ''),
            content: String(message.content || ''),
            messageId: String(message.id || ''),
            timestamp: String(message.timestamp || Date.now()),
            isoTime: new Date(message.timestamp || Date.now()).toISOString()
        };

        return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawKey: string) => {
            const key = String(rawKey || '').trim();
            if (!key) return '';
            if (key in replacements) return replacements[key];
            if (key.startsWith('metadata.')) {
                const value = resolveMetadataPath(message.metadata, key.slice('metadata.'.length));
                return value === undefined || value === null ? '' : String(value);
            }
            return '';
        });
    }

    private isCooldownActive(key: string, cooldownSeconds: number): boolean {
        if (cooldownSeconds <= 0) return false;
        const now = Date.now();
        const until = this.cooldowns.get(key);
        if (!until) return false;
        if (until <= now) {
            this.cooldowns.delete(key);
            return false;
        }
        return true;
    }

    private setCooldown(key: string, cooldownSeconds: number): void {
        if (cooldownSeconds <= 0) return;
        this.cooldowns.set(key, Date.now() + (cooldownSeconds * 1000));
    }
}
