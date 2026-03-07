import fs from 'node:fs';
import path from 'node:path';
import { getRuntimeLogger } from '@/src-backend/core/logger';
import { checkUpdateStatus, type UpdateCheckResult } from '@/src-backend/infra/update-check';
import { DEFAULT_PACKAGE_CHANNEL, normalizeUpdateChannel, type UpdateChannel } from '@/src-backend/infra/update-channels';
import { getUpdateAvailable, runGatewayUpdateCheck, type UpdateAvailable } from '@/src-backend/infra/update-startup';
import {
    runGatewayUpdate,
    type UpdateRunResult,
    type UpdateStepCompletion,
    type UpdateStepInfo
} from '@/src-backend/infra/update-runner';
import { getConfigManager } from './config-instance';
import { resolvePowerDirectorRoot } from './paths';
import { scheduleAppProcessRestart, type ScheduledAppRestart } from './process-restart';

export type UpdateJobStep = {
    name: string;
    command: string;
    index: number;
    total: number;
    status: 'running' | 'ok' | 'error';
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    exitCode?: number | null;
    stderrTail?: string | null;
};

export type UpdateJobSnapshot = {
    id: string;
    channel: UpdateChannel;
    status: 'running' | 'ok' | 'error';
    createdAt: string;
    startedAt: string;
    finishedAt?: string;
    restartReady: boolean;
    error?: string;
    steps: UpdateJobStep[];
    result?: UpdateRunResult;
};

export type UpdateStatusSnapshot = {
    currentVersion: string;
    selectedChannel: UpdateChannel;
    installKind: UpdateCheckResult['installKind'];
    git: {
        tag: string | null;
        branch: string | null;
        behind: number | null;
        ahead: number | null;
        dirty: boolean | null;
    } | null;
    updateAvailable: UpdateAvailable | null;
    job: UpdateJobSnapshot | null;
};

const logger = getRuntimeLogger();
const jobs = new Map<string, UpdateJobSnapshot>();
let currentJobId: string | null = null;

function cloneSnapshot<T>(value: T): T {
    return structuredClone(value);
}

function readCurrentVersion(rootDir: string): string {
    try {
        const packageJsonPath = path.join(rootDir, 'package.json');
        const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version?: string };
        return typeof parsed.version === 'string' && parsed.version.trim().length > 0
            ? parsed.version.trim()
            : 'unknown';
    } catch {
        return 'unknown';
    }
}

function resolveSelectedChannel(raw?: string | null): UpdateChannel {
    const config = getConfigManager().getAll(false) as any;
    return normalizeUpdateChannel(raw) ?? normalizeUpdateChannel(config.update?.channel) ?? DEFAULT_PACKAGE_CHANNEL;
}

function ensureStep(job: UpdateJobSnapshot, info: UpdateStepInfo): UpdateJobStep {
    const existing = job.steps.find((step) => step.index === info.index && step.name === info.name);
    if (existing) {
        return existing;
    }

    const next: UpdateJobStep = {
        name: info.name,
        command: info.command,
        index: info.index,
        total: info.total,
        status: 'running',
        startedAt: new Date().toISOString()
    };
    job.steps.push(next);
    job.steps.sort((left, right) => left.index - right.index);
    return next;
}

function getMutableJob(jobId: string): UpdateJobSnapshot | null {
    return jobs.get(jobId) ?? null;
}

export function getUpdateJobSnapshot(jobId?: string | null): UpdateJobSnapshot | null {
    const effectiveId = jobId ?? currentJobId;
    if (!effectiveId) {
        return null;
    }
    const job = jobs.get(effectiveId);
    return job ? cloneSnapshot(job) : null;
}

export async function refreshUpdateStatus(options: { forceCheck?: boolean } = {}): Promise<UpdateStatusSnapshot> {
    const rootDir = resolvePowerDirectorRoot();
    const config = getConfigManager().getAll(false) as any;
    const selectedChannel = resolveSelectedChannel(config.update?.channel);

    if (options.forceCheck) {
        await runGatewayUpdateCheck({
            cfg: {
                ...config,
                update: {
                    ...(config.update || {}),
                    checkOnStart: true
                }
            },
            log: logger,
            isNixMode: false,
            checkIntervalMs: 0
        });
    }

    const check = await checkUpdateStatus({
        root: rootDir,
        timeoutMs: 4000,
        fetchGit: true,
        includeRegistry: false
    });

    return {
        currentVersion: readCurrentVersion(rootDir),
        selectedChannel,
        installKind: check.installKind,
        git: check.installKind === 'git' && check.git
            ? {
                tag: check.git.tag ?? null,
                branch: check.git.branch ?? null,
                behind: check.git.behind ?? null,
                ahead: check.git.ahead ?? null,
                dirty: check.git.dirty ?? null
            }
            : null,
        updateAvailable: getUpdateAvailable(),
        job: getUpdateJobSnapshot()
    };
}

export async function startUpdateInstall(requestedChannel?: string | null): Promise<UpdateJobSnapshot> {
    const activeJob = currentJobId ? jobs.get(currentJobId) ?? null : null;
    if (activeJob?.status === 'running') {
        return cloneSnapshot(activeJob);
    }

    const rootDir = resolvePowerDirectorRoot();
    const channel = resolveSelectedChannel(requestedChannel);
    const now = new Date().toISOString();
    const jobId = globalThis.crypto?.randomUUID?.() ?? `update_${Date.now()}`;
    const job: UpdateJobSnapshot = {
        id: jobId,
        channel,
        status: 'running',
        createdAt: now,
        startedAt: now,
        restartReady: false,
        steps: []
    };

    jobs.set(jobId, job);
    currentJobId = jobId;

    void (async () => {
        try {
            const result = await runGatewayUpdate({
                cwd: rootDir,
                argv1: process.argv[1],
                channel,
                progress: {
                    onStepStart: (step: UpdateStepInfo) => {
                        const current = getMutableJob(jobId);
                        if (!current) {
                            return;
                        }
                        const target = ensureStep(current, step);
                        target.status = 'running';
                    },
                    onStepComplete: (step: UpdateStepCompletion) => {
                        const current = getMutableJob(jobId);
                        if (!current) {
                            return;
                        }
                        const target = ensureStep(current, step);
                        target.status = step.exitCode === 0 ? 'ok' : 'error';
                        target.completedAt = new Date().toISOString();
                        target.durationMs = step.durationMs;
                        target.exitCode = step.exitCode;
                        target.stderrTail = step.stderrTail ?? null;
                    }
                }
            });

            const current = getMutableJob(jobId);
            if (!current) {
                return;
            }

            current.result = result;
            current.finishedAt = new Date().toISOString();
            current.status = result.status === 'ok' ? 'ok' : 'error';
            current.restartReady = result.status === 'ok';
            current.error = result.status === 'ok' ? undefined : (result.reason || 'Update failed');

            if (result.status === 'ok') {
                try {
                    await refreshUpdateStatus({ forceCheck: true });
                } catch (error) {
                    logger.warn(`update status refresh failed after install: ${String(error)}`);
                }
            }
        } catch (error: any) {
            const current = getMutableJob(jobId);
            if (!current) {
                return;
            }
            current.status = 'error';
            current.finishedAt = new Date().toISOString();
            current.error = error?.message || String(error);
        }
    })();

    return cloneSnapshot(job);
}

export function restartInstalledApp(): ScheduledAppRestart {
    return scheduleAppProcessRestart();
}
