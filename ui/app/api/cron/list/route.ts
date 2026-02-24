
import { NextResponse } from 'next/server';
import { getService } from '../../../../lib/agent-instance';

type UiCronJob = {
    id: string;
    name: string;
    schedule: string;
    action: string;
    payload: string;
    channel: string;
    enabled: boolean;
    agentId?: string;
    description?: string;
    sessionTarget?: string;
};

function toJsonSafe(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === 'bigint') {
        const asNumber = Number(value);
        return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
    }
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((entry) => toJsonSafe(entry, seen));
    }
    if (typeof value === 'object') {
        if (seen.has(value as object)) {
            return '[circular]';
        }
        seen.add(value as object);
        const source = value as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(source)) {
            out[key] = toJsonSafe(entry, seen);
        }
        return out;
    }
    return String(value);
}

function normalizeJobs(rawJobs: any[]): UiCronJob[] {
    return rawJobs.map((job: any, index: number) => {
        const slug = (job?.name || `job-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return {
            id: typeof job?.id === 'string' && job.id.trim() ? job.id : `cron-${index + 1}-${slug || 'task'}`,
            name: typeof job?.name === 'string' ? job.name : `Job ${index + 1}`,
            schedule: typeof job?.schedule === 'string' && job.schedule.trim() ? job.schedule : '0 * * * *',
            action: typeof job?.action === 'string' ? job.action : 'message',
            payload: typeof job?.payload === 'string'
                ? job.payload
                : (typeof job?.command === 'string' ? job.command : ''),
            channel: typeof job?.channel === 'string' ? job.channel : '',
            enabled: job?.enabled !== false,
            agentId: typeof job?.agentId === 'string' ? job.agentId : undefined,
            description: typeof job?.description === 'string' ? job.description : undefined,
            sessionTarget: typeof job?.sessionTarget === 'string' ? job.sessionTarget : undefined
        };
    });
}

export async function GET() {
    let jobs: UiCronJob[] = [];
    let status = {
        enabled: false,
        jobs: 0,
        nextWakeAtMs: null as number | null
    };

    try {
        // Runtime status is the closest source-of-truth for scheduler health.
        const service = getService();
        const runtimeCron = service.gateway?.cronManager;
        if (runtimeCron) {
            const runtimeStatus = toJsonSafe(runtimeCron.getStatus()) as Record<string, unknown>;
            status = {
                enabled: Boolean(runtimeStatus?.enabled),
                jobs: typeof runtimeStatus?.jobs === 'number' ? runtimeStatus.jobs : jobs.length,
                nextWakeAtMs:
                    typeof runtimeStatus?.nextWakeAtMs === 'number'
                        ? runtimeStatus.nextWakeAtMs
                        : null,
                inFlight:
                    typeof runtimeStatus?.inFlight === 'number'
                        ? runtimeStatus.inFlight
                        : undefined,
                maxConcurrent:
                    typeof runtimeStatus?.maxConcurrent === 'number'
                        ? runtimeStatus.maxConcurrent
                        : undefined
            } as typeof status & { inFlight?: number; maxConcurrent?: number };
            jobs = normalizeJobs(runtimeCron.getTasks());
        }
    } catch (e) {
        console.warn('Failed to read runtime cron status; returning default empty status', e);
    }

    return NextResponse.json(toJsonSafe({ jobs, status }));
}
