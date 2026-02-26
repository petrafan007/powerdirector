// AUTOMATICALLY GENERATED Documentation Component for cron
import React from 'react';

const CRON_CONFIGS = [
    {
        path: 'cron.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle authorizing PowerDirector to natively execute autonomous background jobs defined by cron string schedules (e.g. `0 9 * * 1-5` to run a daily morning standup summarizer bot).'
    },
    {
        path: 'cron.store',
        label: 'Store',
        type: 'Enum: sqlite | postgres | memory',
        description: 'Architectural state synchronization. If running a clustered matrix of 10 PowerDirector servers, setting this to `postgres` guarantees a background cron job only fires exactly ONCE across the entire cluster, rather than executing 10 simultaneous clones.'
    },
    {
        path: 'cron.maxConcurrentRuns',
        label: 'Max Concurrent Runs',
        type: 'number',
        description: 'A physical engine throttle. Prevents poorly written schedules (e.g. `* * * * *` executing every single minute) from overwhelming the Node V8 Threadpool by limiting exactly how many distinct cron instances can execute in overlapping parallel states.'
    },
    {
        path: 'cron.webhook',
        label: 'Webhook',
        type: 'string',
        description: 'An external URL (like a Discord channel webhook or a Datadog event endpoint) that PowerDirector actively POSTs to whenever a Scheduled Background Job fires, allowing passive observability of autonomous agents.'
    },
    {
        path: 'cron.webhookToken',
        label: 'Webhook Token',
        type: 'string',
        description: 'An optional Bearer token automatically injected into the `Authorization` header when pinging the external `webhook` endpoint.'
    },
    {
        path: 'cron.sessionRetention',
        label: 'Session Retention',
        type: 'Enum: thread | unique | none',
        description: 'Determines if recurring Agents remember their past jobs. `thread` forces a daily cron agent to append its message into the exact same Slack thread every morning, inherently retaining massive LLM context from the previous day. `unique` spawns a fresh spotless Agent instance every execution.'
    }
];

export default function CronConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Background Automation Schedules Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Engine protocols governing how PowerDirector executes completely autonomous timeline-based actions. Controls concurrency ceilings, cluster state locks, and session memory accumulation for recurring Agents.</p>
            </div>
            <div className="space-y-6">
                {CRON_CONFIGS.map((config) => (
                    <div key={config.path} id={config.path} className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                        <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{config.label}</h3>
                        <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Path: <span className="text-[var(--pd-text-main)] font-semibold">{config.path}</span>
                            </span>
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Type: <span className="text-[var(--pd-text-main)] font-semibold">{config.type}</span>
                            </span>
                        </div>
                        <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                            <p>{config.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
