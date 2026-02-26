// @ts-nocheck
import type { Channel } from '../channels/base.ts';
import { getRuntimeLogger } from './logger.ts';

type BroadcastStrategy = 'parallel' | 'sequential';

export interface BroadcastConfig {
    strategy?: BroadcastStrategy;
    [peerId: string]: string[] | BroadcastStrategy | undefined;
}

interface Target {
    channelId: string;
    recipientId: string;
}

export interface BroadcastResult {
    attempted: number;
    succeeded: number;
    failed: number;
    failures: Array<{ target: string; error: string }>;
}

function normalizeString(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
}

export class BroadcastManager {
    private readonly logger = getRuntimeLogger();
    private readonly strategy: BroadcastStrategy;
    private readonly targets: Target[];

    constructor(config: BroadcastConfig = {}) {
        this.strategy = config.strategy === 'sequential' ? 'sequential' : 'parallel';
        this.targets = this.parseTargets(config);
    }

    public isEnabled(): boolean {
        return this.targets.length > 0;
    }

    public getTargets(): Target[] {
        return this.targets.map((target) => ({ ...target }));
    }

    public async broadcast(content: string, channels: Map<string, Channel>): Promise<BroadcastResult> {
        if (this.targets.length === 0) {
            throw new Error('No broadcast targets configured. Configure broadcast peer mappings in config.');
        }

        const payload = String(content || '');
        const failures: Array<{ target: string; error: string }> = [];
        let succeeded = 0;

        const sendTarget = async (target: Target) => {
            const key = `${target.channelId}:${target.recipientId}`;
            const channel = channels.get(target.channelId);
            if (!channel) {
                failures.push({ target: key, error: `Channel "${target.channelId}" is not registered.` });
                return;
            }
            try {
                await channel.send(target.recipientId, payload);
                succeeded += 1;
            } catch (error: any) {
                failures.push({ target: key, error: error?.message || String(error) });
            }
        };

        if (this.strategy === 'sequential') {
            for (const target of this.targets) {
                await sendTarget(target);
            }
        } else {
            await Promise.all(this.targets.map((target) => sendTarget(target)));
        }

        return {
            attempted: this.targets.length,
            succeeded,
            failed: failures.length,
            failures
        };
    }

    private parseTargets(config: BroadcastConfig): Target[] {
        const out: Target[] = [];
        const rawConfig = config && typeof config === 'object' ? config : {};
        for (const [peerId, rawTargets] of Object.entries(rawConfig)) {
            if (peerId === 'strategy') continue;
            if (!Array.isArray(rawTargets)) continue;
            for (const raw of rawTargets) {
                const value = normalizeString(raw);
                if (!value) continue;

                const asPair = this.parseTargetPair(value);
                if (asPair) {
                    out.push(asPair);
                    continue;
                }

                const channelId = normalizeString(peerId);
                if (!channelId) {
                    this.logger.warn(`Skipping invalid broadcast target "${value}".`);
                    continue;
                }
                out.push({ channelId, recipientId: value });
            }
        }
        return out;
    }

    private parseTargetPair(value: string): Target | null {
        const split = value.indexOf(':');
        if (split <= 0 || split >= value.length - 1) {
            return null;
        }
        const channelId = value.slice(0, split).trim();
        const recipientId = value.slice(split + 1).trim();
        if (!channelId || !recipientId) {
            this.logger.warn(`Skipping invalid broadcast target "${value}".`);
            return null;
        }
        return { channelId, recipientId };
    }

    public getStrategy(): BroadcastStrategy {
        return this.strategy;
    }

    public getPeerMap(): Record<string, string[]> {
        const map: Record<string, string[]> = {};
        for (const target of this.targets) {
            if (!map[target.channelId]) {
                map[target.channelId] = [];
            }
            map[target.channelId].push(target.recipientId);
        }
        return map;
    }
}
