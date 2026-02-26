// @ts-nocheck
import { Message, ContextBudget, ContentPart } from './types';
import { BudgetManager } from './budget';

type ContextPruningMode = 'off' | 'cache-ttl';

type ContextPruningToolMatch = {
    allow?: string[];
    deny?: string[];
};

export interface ContextPruningConfig {
    mode?: ContextPruningMode;
    ttl?: string;
    keepLastAssistants?: number;
    softTrimRatio?: number;
    hardClearRatio?: number;
    minPrunableToolChars?: number;
    tools?: ContextPruningToolMatch;
    softTrim?: {
        maxChars?: number;
        headChars?: number;
        tailChars?: number;
    };
    hardClear?: {
        enabled?: boolean;
        placeholder?: string;
    };
    contextWindowTokens?: number;
    lastCacheTouchAt?: number | null;
}

type EffectiveContextPruningSettings = {
    mode: 'cache-ttl';
    ttlMs: number;
    keepLastAssistants: number;
    softTrimRatio: number;
    hardClearRatio: number;
    minPrunableToolChars: number;
    tools: ContextPruningToolMatch;
    softTrim: {
        maxChars: number;
        headChars: number;
        tailChars: number;
    };
    hardClear: {
        enabled: boolean;
        placeholder: string;
    };
    contextWindowTokens?: number;
};

const CHARS_PER_TOKEN_ESTIMATE = 4;
const IMAGE_CHAR_ESTIMATE = 8000;

const DEFAULT_CONTEXT_PRUNING_SETTINGS: EffectiveContextPruningSettings = {
    mode: 'cache-ttl',
    ttlMs: 5 * 60 * 1000,
    keepLastAssistants: 3,
    softTrimRatio: 0.3,
    hardClearRatio: 0.5,
    minPrunableToolChars: 50_000,
    tools: {},
    softTrim: {
        maxChars: 4000,
        headChars: 1500,
        tailChars: 1500
    },
    hardClear: {
        enabled: true,
        placeholder: '[Old tool result content cleared]'
    }
};

function parseDurationMs(raw: string, defaultUnit: 'ms' | 's' | 'm' | 'h' | 'd' = 'ms'): number {
    const trimmed = String(raw ?? '').trim().toLowerCase();
    if (!trimmed) {
        throw new Error('invalid duration (empty)');
    }

    const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/.exec(trimmed);
    if (!match) {
        throw new Error(`invalid duration: ${raw}`);
    }

    const value = Number(match[1]);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`invalid duration: ${raw}`);
    }

    const unit = (match[2] ?? defaultUnit) as 'ms' | 's' | 'm' | 'h' | 'd';
    const multiplier =
        unit === 'ms'
            ? 1
            : unit === 's'
                ? 1000
                : unit === 'm'
                    ? 60000
                    : unit === 'h'
                        ? 3600000
                        : 86400000;
    const ms = Math.round(value * multiplier);
    if (!Number.isFinite(ms)) {
        throw new Error(`invalid duration: ${raw}`);
    }
    return ms;
}

function computeEffectiveSettings(raw?: ContextPruningConfig): EffectiveContextPruningSettings | null {
    if (!raw || raw.mode !== 'cache-ttl') {
        return null;
    }

    const settings: EffectiveContextPruningSettings = structuredClone(DEFAULT_CONTEXT_PRUNING_SETTINGS);
    if (typeof raw.ttl === 'string' && raw.ttl.trim().length > 0) {
        try {
            settings.ttlMs = parseDurationMs(raw.ttl, 'm');
        } catch {
            // keep defaults
        }
    }
    if (typeof raw.keepLastAssistants === 'number' && Number.isFinite(raw.keepLastAssistants)) {
        settings.keepLastAssistants = Math.max(0, Math.floor(raw.keepLastAssistants));
    }
    if (typeof raw.softTrimRatio === 'number' && Number.isFinite(raw.softTrimRatio)) {
        settings.softTrimRatio = Math.min(1, Math.max(0, raw.softTrimRatio));
    }
    if (typeof raw.hardClearRatio === 'number' && Number.isFinite(raw.hardClearRatio)) {
        settings.hardClearRatio = Math.min(1, Math.max(0, raw.hardClearRatio));
    }
    if (typeof raw.minPrunableToolChars === 'number' && Number.isFinite(raw.minPrunableToolChars)) {
        settings.minPrunableToolChars = Math.max(0, Math.floor(raw.minPrunableToolChars));
    }

    if (raw.tools) {
        settings.tools = {
            allow: Array.isArray(raw.tools.allow) ? raw.tools.allow.filter((v) => typeof v === 'string' && v.trim().length > 0) : undefined,
            deny: Array.isArray(raw.tools.deny) ? raw.tools.deny.filter((v) => typeof v === 'string' && v.trim().length > 0) : undefined
        };
    }
    if (raw.softTrim) {
        if (typeof raw.softTrim.maxChars === 'number' && Number.isFinite(raw.softTrim.maxChars)) {
            settings.softTrim.maxChars = Math.max(0, Math.floor(raw.softTrim.maxChars));
        }
        if (typeof raw.softTrim.headChars === 'number' && Number.isFinite(raw.softTrim.headChars)) {
            settings.softTrim.headChars = Math.max(0, Math.floor(raw.softTrim.headChars));
        }
        if (typeof raw.softTrim.tailChars === 'number' && Number.isFinite(raw.softTrim.tailChars)) {
            settings.softTrim.tailChars = Math.max(0, Math.floor(raw.softTrim.tailChars));
        }
    }
    if (raw.hardClear) {
        if (typeof raw.hardClear.enabled === 'boolean') {
            settings.hardClear.enabled = raw.hardClear.enabled;
        }
        if (typeof raw.hardClear.placeholder === 'string' && raw.hardClear.placeholder.trim().length > 0) {
            settings.hardClear.placeholder = raw.hardClear.placeholder.trim();
        }
    }
    if (typeof raw.contextWindowTokens === 'number' && Number.isFinite(raw.contextWindowTokens) && raw.contextWindowTokens > 0) {
        settings.contextWindowTokens = Math.floor(raw.contextWindowTokens);
    }

    return settings;
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(glob: string): RegExp | null {
    const normalized = String(glob || '').trim().toLowerCase();
    if (!normalized) return null;
    const pattern = `^${normalized
        .split('')
        .map((ch) => {
            if (ch === '*') return '.*';
            if (ch === '?') return '.';
            return escapeRegex(ch);
        })
        .join('')}$`;
    try {
        return new RegExp(pattern, 'i');
    } catch {
        return null;
    }
}

export class ContextPruner {
    private readonly pruning: EffectiveContextPruningSettings | null;
    private lastCacheTouchAt: number | null;

    constructor(
        private budgetManager: BudgetManager,
        private config: ContextBudget,
        pruningConfig?: ContextPruningConfig
    ) {
        this.pruning = computeEffectiveSettings(pruningConfig);
        this.lastCacheTouchAt = typeof pruningConfig?.lastCacheTouchAt === 'number'
            ? pruningConfig.lastCacheTouchAt
            : null;
    }

    public prune(history: Message[]): Message[] {
        let pruned = history.map((msg) => this.cloneMessage(msg));

        // 1. Evict old media first if over total image budget.
        pruned = this.enforceMediaBudget(pruned);

        pruned = this.applyContextPruning(pruned);

        // 3. Enforce token budget on the final history window.
        pruned = this.enforceTokenBudget(pruned);

        if (this.pruning?.mode === 'cache-ttl') {
            this.lastCacheTouchAt = Date.now();
        }

        return pruned;
    }

    private cloneMessage(msg: Message): Message {
        const content = Array.isArray(msg.content)
            ? msg.content.map((part) => ({ ...part }))
            : msg.content;
        const metadata = msg.metadata && typeof msg.metadata === 'object'
            ? { ...msg.metadata }
            : msg.metadata;
        return {
            ...msg,
            content,
            metadata
        };
    }

    private applyContextPruning(messages: Message[]): Message[] {
        if (!this.pruning) return messages;
        if (this.pruning.mode === 'cache-ttl' && this.pruning.ttlMs > 0 && this.lastCacheTouchAt) {
            const elapsed = Date.now() - this.lastCacheTouchAt;
            if (elapsed < this.pruning.ttlMs) {
                return messages;
            }
        }

        const charWindow = this.resolveCharWindow();
        if (charWindow <= 0) {
            return messages;
        }

        const cutoffIndex = this.findAssistantCutoffIndex(messages, this.pruning.keepLastAssistants);
        if (cutoffIndex === null) {
            return messages;
        }
        const firstUserIndex = this.findFirstUserIndex(messages);
        const pruneStartIndex = firstUserIndex === null ? messages.length : firstUserIndex;

        let totalChars = this.estimateContextChars(messages);
        let ratio = totalChars / charWindow;
        if (ratio < this.pruning.softTrimRatio) {
            return messages;
        }

        const prunableIndexes: number[] = [];
        const next = messages.slice();

        for (let i = pruneStartIndex; i < cutoffIndex; i += 1) {
            const msg = next[i];
            if (!this.isPrunableToolResultMessage(msg)) {
                continue;
            }
            prunableIndexes.push(i);

            const updated = this.softTrimToolResultMessage(msg);
            if (!updated) {
                continue;
            }
            const beforeChars = this.estimateMessageChars(msg);
            const afterChars = this.estimateMessageChars(updated);
            totalChars += afterChars - beforeChars;
            next[i] = updated;
        }

        ratio = totalChars / charWindow;
        if (ratio < this.pruning.hardClearRatio || !this.pruning.hardClear.enabled) {
            return next;
        }

        let prunableChars = 0;
        for (const idx of prunableIndexes) {
            const msg = next[idx];
            if (!this.isPrunableToolResultMessage(msg)) {
                continue;
            }
            prunableChars += this.estimateMessageChars(msg);
        }

        if (prunableChars < this.pruning.minPrunableToolChars) {
            return next;
        }

        for (const idx of prunableIndexes) {
            if (ratio < this.pruning.hardClearRatio) {
                break;
            }
            const msg = next[idx];
            if (!this.isPrunableToolResultMessage(msg)) {
                continue;
            }
            const cleared = this.clearToolResultMessage(msg);
            const beforeChars = this.estimateMessageChars(msg);
            const afterChars = this.estimateMessageChars(cleared);
            next[idx] = cleared;
            totalChars += afterChars - beforeChars;
            ratio = totalChars / charWindow;
        }

        return next;
    }

    private resolveCharWindow(): number {
        const tokens = this.pruning?.contextWindowTokens || this.config.maxTokens;
        if (!tokens || !Number.isFinite(tokens) || tokens <= 0) return 0;
        return Math.floor(tokens * CHARS_PER_TOKEN_ESTIMATE);
    }

    private findAssistantCutoffIndex(messages: Message[], keepLastAssistants: number): number | null {
        if (keepLastAssistants <= 0) {
            return messages.length;
        }
        let remaining = keepLastAssistants;
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            if (messages[i]?.role !== 'assistant') continue;
            remaining -= 1;
            if (remaining === 0) {
                return i;
            }
        }
        return null;
    }

    private findFirstUserIndex(messages: Message[]): number | null {
        for (let i = 0; i < messages.length; i += 1) {
            if (messages[i]?.role === 'user') return i;
        }
        return null;
    }

    private normalizeToolName(message: Message): string {
        const metaTool = typeof message.metadata?.tool === 'string'
            ? message.metadata.tool
            : (typeof message.metadata?.toolName === 'string' ? message.metadata.toolName : '');
        if (metaTool.trim()) return metaTool.trim().toLowerCase();

        if (typeof message.content === 'string') {
            const match = /^\[Tool Output for ([^\]]+)\]:/i.exec(message.content.trim());
            if (match?.[1]) {
                return match[1].trim().toLowerCase();
            }
        }
        return '';
    }

    private matchesToolAllowDeny(toolName: string): boolean {
        const normalizedTool = toolName.trim().toLowerCase();
        if (!normalizedTool) return false;
        const denyPatterns = Array.isArray(this.pruning?.tools.deny) ? this.pruning!.tools.deny : [];
        const allowPatterns = Array.isArray(this.pruning?.tools.allow) ? this.pruning!.tools.allow : [];

        for (const pattern of denyPatterns) {
            const re = globToRegex(pattern);
            if (re?.test(normalizedTool)) {
                return false;
            }
        }

        if (allowPatterns.length === 0) {
            return true;
        }

        for (const pattern of allowPatterns) {
            const re = globToRegex(pattern);
            if (re?.test(normalizedTool)) {
                return true;
            }
        }
        return false;
    }

    private messageHasMedia(message: Message): boolean {
        if (!Array.isArray(message.content)) return false;
        return message.content.some((part) => part.type === 'image' || part.type === 'file');
    }

    private isPrunableToolResultMessage(message: Message): boolean {
        if (this.messageHasMedia(message)) {
            return false;
        }
        const toolName = this.normalizeToolName(message);
        if (!toolName) {
            return false;
        }

        // Prefer completed tool outputs only (runtime metadata convention).
        const status = typeof message.metadata?.status === 'string'
            ? message.metadata.status.toLowerCase()
            : '';
        if (status && status !== 'completed') {
            return false;
        }

        return this.matchesToolAllowDeny(toolName);
    }

    private messageText(message: Message): string {
        if (typeof message.content === 'string') {
            return message.content;
        }
        const parts: string[] = [];
        for (const part of message.content) {
            if (part.type === 'text') {
                parts.push(part.text);
            }
        }
        return parts.join('\n');
    }

    private softTrimToolResultMessage(message: Message): Message | null {
        if (!this.pruning) return null;
        const text = this.messageText(message);
        const rawLen = text.length;
        if (rawLen <= this.pruning.softTrim.maxChars) {
            return null;
        }

        const headChars = Math.max(0, this.pruning.softTrim.headChars);
        const tailChars = Math.max(0, this.pruning.softTrim.tailChars);
        if (headChars + tailChars >= rawLen) {
            return null;
        }

        const head = text.slice(0, headChars);
        const tail = tailChars > 0 ? text.slice(rawLen - tailChars) : '';
        const note = `\n\n[Tool result trimmed: kept first ${headChars} chars and last ${tailChars} chars of ${rawLen} chars.]`;
        const trimmed = `${head}\n...\n${tail}${note}`;
        return {
            ...message,
            content: trimmed
        };
    }

    private clearToolResultMessage(message: Message): Message {
        const placeholder = this.pruning?.hardClear.placeholder || '[Old tool result content cleared]';
        return {
            ...message,
            content: placeholder
        };
    }

    private estimateMessageChars(message: Message): number {
        if (Array.isArray(message.content)) {
            let chars = 0;
            for (const part of message.content) {
                if (part.type === 'text') {
                    chars += part.text.length;
                } else {
                    chars += IMAGE_CHAR_ESTIMATE;
                }
            }
            return chars;
        }
        return String(message.content || '').length;
    }

    private estimateContextChars(messages: Message[]): number {
        let total = 0;
        for (const message of messages) {
            total += this.estimateMessageChars(message);
        }
        return total;
    }

    private enforceMediaBudget(messages: Message[]): Message[] {
        let currentImages = this.countImages(messages);
        if (currentImages <= this.config.maxTotalImages) return messages;

        // Keep recent media, prune older media blocks first.
        const safeIndex = messages.length - 1;

        for (let i = 0; i < safeIndex; i++) {
            const msg = messages[i];
            if (!Array.isArray(msg.content)) continue;
            const mediaCount = msg.content.filter((p) => p.type === 'image' || p.type === 'file').length;
            if (mediaCount <= 0) continue;

            msg.content = msg.content.filter((p) => p.type !== 'image' && p.type !== 'file');
            (msg.content as ContentPart[]).push({ type: 'text', text: ' [Image/file pruned] ' });

            currentImages -= mediaCount;
            if (currentImages <= this.config.maxTotalImages) break;
        }
        return messages;
    }

    private enforceTokenBudget(messages: Message[]): Message[] {
        const systemPrompt = this.config.retainSystemPrompt ? messages.find((m) => m.role === 'system') : null;
        let window = this.config.retainSystemPrompt
            ? messages.filter((m) => m.role !== 'system')
            : [...messages];

        while (this.budgetManager.checkTotalBudget(window) === false && window.length > 1) {
            window.shift();
        }

        if (systemPrompt) {
            return [systemPrompt, ...window];
        }
        return window;
    }

    private countImages(messages: Message[]): number {
        let count = 0;
        for (const msg of messages) {
            if (Array.isArray(msg.content)) {
                count += msg.content.filter((p) => p.type === 'image' || p.type === 'file').length;
            }
        }
        return count;
    }
}
