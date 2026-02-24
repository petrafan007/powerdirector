// AUTOMATICALLY GENERATED Documentation Component for logging
import React from 'react';

const LOGGING_CONFIGS = [
    {
        path: 'logging.level',
        label: 'Level',
        type: 'Enum: trace | debug | info | warn | error | fatal',
        description: 'The master diagnostic threshold for the internal `winston` logging engine. Setting this to `trace` dumps immensely verbose sub-millisecond execution vectors into the console, whereas `error` guarantees a completely silent terminal unless a physical crash occurs.'
    },
    {
        path: 'logging.file',
        label: 'File',
        type: 'string',
        description: 'An absolute OS directory path (e.g. `/var/log/powerdirector/`) where the system will persist output streams into physical `.log` files, automatically rotating them at midnight to prevent disk exhaustion.'
    },
    {
        path: 'logging.consoleLevel',
        label: 'Console Level',
        type: 'Enum: trace | debug | info | warn | error | fatal',
        description: 'Allows bifurcating log visibility. You can set the global `logging.level` to `debug` to write deep execution details to the physical `-file` on disk, while forcing the `consoleLevel` to `info` to keep the active terminal window uncluttered.'
    },
    {
        path: 'logging.consoleStyle',
        label: 'Console Style',
        type: 'Enum: json | pretty',
        description: 'Dictates terminal visual aesthetics. `json` is strictly required if wrapping PowerDirector entirely inside a Docker container where a Fluentd or Datadog agent is aggregating `stdout`. `pretty` utilizes human-readable ANSI color codes for local Node.js development.'
    },
    {
        path: 'logging.redactSensitive',
        label: 'Redact Sensitive',
        type: 'boolean',
        description: 'A critical enterprise security toggle. If `true`, the `winston` engine aggressively traverses every single log JSON object just before it writes to `stdout` or disk, mathematically scrubbing out any keys matching the `redactPatterns` dictionary to prevent accidental credential leakage in logs.'
    },
    {
        path: 'logging.redactPatterns',
        label: 'Redact Patterns',
        type: 'array',
        description: 'Custom regex or string array lists (e.g. `["*api_key*", "*password*", "*bearer*"]`) instructing the redaction engine exactly which JSON object keys to mask over with `[REDACTED]` strings before committing them to observability pipelines.'
    }
];

export default function LoggingConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Observability & Logging</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Core metrics determining how PowerDirector outputs its internal state to the host console, manages log file rotation, and natively obfuscates heavily sensitive API keys from tracing aggregators.</p>
            </div>
            <div className="space-y-6">
                {LOGGING_CONFIGS.map((config) => (
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
