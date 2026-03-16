// @ts-nocheck
import { spawn } from 'node:child_process';
import { getRuntimeLogger } from './logger.js';

export interface HookEntry {
    enabled?: boolean;
    script?: string;
    trigger?: string;
}

export interface HooksConfig {
    internal?: {
        enabled?: boolean;
        entries?: Record<string, HookEntry>;
    };
}

interface HooksManagerOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
}

interface ResolvedHookEntry {
    name: string;
    trigger: string;
    script: string;
}

function normalizeTrigger(value: string | undefined | null): string {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
}

export class HooksManager {
    private readonly logger = getRuntimeLogger();
    private readonly enabled: boolean;
    private readonly entries: ResolvedHookEntry[];
    private readonly cwd?: string;
    private readonly env?: NodeJS.ProcessEnv;
    private readonly timeoutMs: number;

    constructor(config: HooksConfig = {}, options: HooksManagerOptions = {}) {
        this.enabled = config.internal?.enabled ?? true;
        this.cwd = options.cwd;
        this.env = options.env;
        this.timeoutMs = Math.max(1000, options.timeoutMs ?? 15000);
        this.entries = this.resolveEntries(config.internal?.entries || {});
    }

    public isEnabled(): boolean {
        return this.enabled && this.entries.length > 0;
    }

    public async emit(trigger: string, payload: Record<string, any> = {}): Promise<void> {
        if (!this.enabled) return;
        const normalizedTrigger = normalizeTrigger(trigger);
        if (!normalizedTrigger) return;

        const matching = this.entries.filter((entry) => entry.trigger === normalizedTrigger);
        for (const entry of matching) {
            try {
                await this.runEntry(entry, payload);
            } catch (error) {
                this.logger.error(`Hook "${entry.name}" failed:`, error);
            }
        }
    }

    private resolveEntries(entries: Record<string, HookEntry>): ResolvedHookEntry[] {
        const out: ResolvedHookEntry[] = [];

        for (const [name, entry] of Object.entries(entries || {})) {
            if (!entry || entry.enabled === false) continue;
            const trigger = normalizeTrigger(entry.trigger);
            const script = typeof entry.script === 'string' ? entry.script.trim() : '';

            if (!trigger || !script) {
                this.logger.warn(`Skipping hook "${name}" due to missing trigger or script.`);
                continue;
            }

            out.push({ name, trigger, script });
        }

        return out;
    }

    private async runEntry(entry: ResolvedHookEntry, payload: Record<string, any>): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const child = spawn('/bin/sh', ['-lc', entry.script], {
                cwd: this.cwd || process.cwd(),
                env: {
                    ...(process.env || {}),
                    ...(this.env || {}),
                    PD_HOOK_NAME: entry.name,
                    PD_HOOK_TRIGGER: entry.trigger,
                    PD_HOOK_PAYLOAD: this.stringifyPayload(payload)
                },
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stderr = '';
            child.stderr.on('data', (chunk: Buffer) => {
                stderr += chunk.toString('utf-8');
            });

            const timer = setTimeout(() => {
                child.kill('SIGKILL');
                reject(new Error(`Hook "${entry.name}" timed out after ${this.timeoutMs}ms.`));
            }, this.timeoutMs);

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });

            child.on('close', (code) => {
                clearTimeout(timer);
                if (code !== 0) {
                    reject(new Error(`Hook "${entry.name}" exited with code ${code}. ${stderr.trim()}`));
                    return;
                }
                resolve();
            });
        });
    }

    private stringifyPayload(payload: Record<string, any>): string {
        try {
            const json = JSON.stringify(payload);
            if (json.length <= 32768) return json;
            return `${json.slice(0, 32768)}...[truncated]`;
        } catch {
            return '{}';
        }
    }
}
