import { restartGatewayProcessWithFreshPid } from '@/src-backend/infra/process-respawn';

export type ScheduledAppRestart = {
    ok: boolean;
    scheduled: boolean;
    mode: 'spawned' | 'supervised' | 'disabled' | 'failed';
    pid?: number;
    detail?: string;
};

let scheduledRestart: ScheduledAppRestart | null = null;

export function scheduleAppProcessRestart(delayMs = 2000): ScheduledAppRestart {
    if (scheduledRestart) {
        return scheduledRestart;
    }

    const result = restartGatewayProcessWithFreshPid();
    if (result.mode === 'spawned' || result.mode === 'supervised') {
        scheduledRestart = {
            ok: true,
            scheduled: true,
            mode: result.mode,
            pid: result.pid,
            detail: result.detail
        };
        setTimeout(() => {
            process.exit(0);
        }, Math.max(0, Math.floor(delayMs)));
        return scheduledRestart;
    }

    return {
        ok: false,
        scheduled: false,
        mode: result.mode,
        pid: result.pid,
        detail: result.detail
    };
}
