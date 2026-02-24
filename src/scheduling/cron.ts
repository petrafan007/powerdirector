// @ts-nocheck
import { CronJob } from 'cron';

export type CronAction = 'message' | 'command' | 'webhook';

export interface ScheduledTask {
    id: string;
    name: string;
    schedule: string; // Cron expression
    command?: string; // Backward-compatible alias for payload
    action?: CronAction;
    payload?: string;
    channel?: string;
    enabled: boolean;
}

export interface CronManagerOptions {
    enabled?: boolean;
    maxConcurrentRuns?: number;
    onExecute?: (task: ScheduledTask) => Promise<void> | void;
}

export interface CronStatusSnapshot {
    enabled: boolean;
    jobs: number;
    inFlight: number;
    maxConcurrent: number;
    nextWakeAtMs: number | null;
}

export class CronManager {
    private tasks: Map<string, ScheduledTask> = new Map();
    private jobs: Map<string, CronJob> = new Map();
    private enabled: boolean;
    private readonly maxConcurrentRuns: number;
    private inFlightCount: number = 0;
    private onExecute?: (task: ScheduledTask) => Promise<void> | void;

    constructor(options: CronManagerOptions = {}) {
        this.enabled = options.enabled ?? false;
        this.maxConcurrentRuns = Math.max(1, options.maxConcurrentRuns ?? 5);
        this.onExecute = options.onExecute;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (enabled) {
            this.startAll();
            return;
        }
        this.stopAll();
    }

    public setExecutor(handler?: (task: ScheduledTask) => Promise<void> | void): void {
        this.onExecute = handler;
    }

    registerTask(task: ScheduledTask) {
        const normalized = this.normalizeTask(task);
        if (this.jobs.has(normalized.id)) {
            this.stopJob(normalized.id);
        }

        this.tasks.set(normalized.id, normalized);
        if (this.enabled && normalized.enabled) {
            this.startJob(normalized.id);
        }
    }

    startJob(id: string) {
        if (!this.enabled) return;
        const task = this.tasks.get(id);
        if (!task) return;
        if (!task.enabled) return;
        if (this.jobs.has(id)) return;

        try {
            console.log(`Starting cron job: ${task.name} (${task.schedule})`);
            const job = new CronJob(task.schedule, () => {
                this.executeTask(task).catch((error) => {
                    console.error(`[Cron:${task.id}] execution failed:`, error);
                });
            });
            job.start();
            this.jobs.set(id, job);
        } catch (error: any) {
            console.error(`Invalid cron configuration for "${task.name}" (${task.schedule}): ${error.message}`);
        }
    }

    stopJob(id: string) {
        const job = this.jobs.get(id);
        if (job) {
            job.stop();
            this.jobs.delete(id);
            console.log(`Stopped cron job: ${id}`);
        }
    }

    public replaceTasks(tasks: ScheduledTask[]): void {
        this.stopAll();
        this.tasks.clear();
        for (const task of tasks) {
            this.registerTask(task);
        }
    }

    public startAll(): void {
        for (const id of this.tasks.keys()) {
            this.startJob(id);
        }
    }

    public stopAll(): void {
        for (const id of Array.from(this.jobs.keys())) {
            this.stopJob(id);
        }
    }

    getTasks(): ScheduledTask[] {
        return Array.from(this.tasks.values());
    }

    public getNextWakeAtMs(): number | null {
        let nextWakeAtMs: number | null = null;
        for (const job of this.jobs.values()) {
            const nextMs = this.resolveNextRunMs(job);
            if (nextMs == null) continue;
            if (nextWakeAtMs == null || nextMs < nextWakeAtMs) {
                nextWakeAtMs = nextMs;
            }
        }
        return nextWakeAtMs;
    }

    public getStatus(): CronStatusSnapshot {
        return {
            enabled: this.enabled,
            jobs: this.tasks.size,
            inFlight: this.inFlightCount,
            maxConcurrent: this.maxConcurrentRuns,
            nextWakeAtMs: this.getNextWakeAtMs()
        };
    }

    private normalizeTask(task: ScheduledTask): ScheduledTask {
        const action: CronAction = task.action ?? 'message';
        const payload = typeof task.payload === 'string'
            ? task.payload
            : (typeof task.command === 'string' ? task.command : '');

        return {
            id: task.id,
            name: task.name,
            schedule: task.schedule,
            enabled: task.enabled !== false,
            action,
            payload,
            command: payload,
            channel: typeof task.channel === 'string' ? task.channel : ''
        };
    }

    private async executeTask(task: ScheduledTask): Promise<void> {
        if (!task.enabled) return;

        if (this.inFlightCount >= this.maxConcurrentRuns) {
            console.warn(`[Cron:${task.id}] Execution skipped: max concurrent runs (${this.maxConcurrentRuns}) reached.`);
            return;
        }

        if (!this.onExecute) {
            console.log(`[Cron:${task.id}] No executor configured. Payload: ${task.payload || ''}`);
            return;
        }

        this.inFlightCount++;
        try {
            await this.onExecute(task);
        } finally {
            this.inFlightCount--;
        }
    }

    private resolveNextRunMs(job: CronJob): number | null {
        try {
            const next: any = (job as any).nextDate?.();
            if (!next) return null;
            if (typeof next.toMillis === 'function') {
                return next.toMillis();
            }
            if (typeof next.toJSDate === 'function') {
                return next.toJSDate().getTime();
            }
            if (next instanceof Date) {
                return next.getTime();
            }
            const numeric = Number(next);
            return Number.isFinite(numeric) ? numeric : null;
        } catch {
            return null;
        }
    }
}
