// AUTOMATICALLY GENERATED Documentation Component for diagnostics
import React from 'react';

const DIAGNOSTICS_CONFIGS = [
    {
        path: 'diagnostics.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Global master toggle governing whether PowerDirector internally tracks system telemetry, execution timings, and detailed error traces beyond standard raw console logs.'
    },
    {
        path: 'diagnostics.flags',
        label: 'Flags',
        type: 'array',
        description: 'Advanced heuristic array enabling highly specific underlying subsystem tracing (e.g. `trace:websocket`, `trace:llm_tokens`, `trace:db_locks`). Primarily utilized by core developers to isolate race conditions.'
    },
    {
        path: 'diagnostics.otel',
        label: 'Otel',
        type: 'object',
        description: 'Settings explicitly managing the OpenTelemetry (OTel) execution layer, allowing PowerDirector to seamlessly export metrics to external APM platforms like Datadog, New Relic, or open-source Jaeger.'
    },
    {
        path: 'diagnostics.otel.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Activates the OpenTelemetry Exporter daemon within the Node.js background loop.'
    },
    {
        path: 'diagnostics.otel.endpoint',
        label: 'Endpoint',
        type: 'string',
        description: 'The physical target URL (e.g., `http://localhost:4318/v1/traces`) where PowerDirector pushes its compressed OTLP metrics.'
    },
    {
        path: 'diagnostics.otel.protocol',
        label: 'Protocol',
        type: 'Enum: grpc | http/protobuf | http/json',
        description: 'The transit protocol for metric shipping. `grpc` is wildly efficient but requires HTTP/2. `http/json` is slower but universally compatible through primitive reverse proxies.'
    },
    {
        path: 'diagnostics.otel.headers',
        label: 'Headers',
        type: 'record',
        description: 'Cryptographic KV pairs appended to telemetry pushes, often containing APM License Keys (e.g. `x-honeycomb-team: <token>`).'
    },
    {
        path: 'diagnostics.otel.serviceName',
        label: 'Service Name',
        type: 'string',
        description: 'The identifier tag the APM platform groups these logs under. Usually left as `powerdirector` unless running multiple specific physical shards.'
    },
    {
        path: 'diagnostics.otel.traces',
        label: 'Traces',
        type: 'boolean',
        description: 'Toggles the exportation of Waterfall/Span data (e.g. measuring exactly how many milliseconds the `fetch_url` Tool took within a 15-second LLM execution).'
    },
    {
        path: 'diagnostics.otel.metrics',
        label: 'Metrics',
        type: 'boolean',
        description: 'Toggles the exportation of quantitative system health numbers, like active WebSocket connections, V8 heap size, and total prompt tokens accumulated.'
    },
    {
        path: 'diagnostics.otel.logs',
        label: 'Logs',
        type: 'boolean',
        description: 'If `true`, natively packages standard `console.log` and `winston` outputs into the rigid OTel format to centralize logging alongside Traces.'
    },
    {
        path: 'diagnostics.otel.sampleRate',
        label: 'Sample Rate',
        type: 'number',
        description: 'A decimal threshold between `0.0` and `1.0`. `0.1` means only 10% of LLM executions generate telemetry, drastically saving APM bandwidth costs on massive production clusters.'
    },
    {
        path: 'diagnostics.otel.flushIntervalMs',
        label: 'Flush Interval Ms',
        type: 'number',
        description: 'Timer dictating how long the Node daemon buffers analytics data in local RAM before executing a bulk HTTP POST out to the endpoint.'
    },
    {
        path: 'diagnostics.cacheTrace',
        label: 'Cache Trace',
        type: 'object',
        description: 'A dedicated, highly invasive debugging layer for tracking precisely why standard AI searches or LLM cache hits either succeeded or failed during complex chained interactions.'
    },
    {
        path: 'diagnostics.cacheTrace.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Turns on the verbose cache tracer natively.'
    },
    {
        path: 'diagnostics.cacheTrace.filePath',
        label: 'File Path',
        type: 'string',
        description: 'The exact absolute OS directory where `cache_dump.json` traces are violently dumped. WARNING: These files grow incredibly large, incredibly quickly.'
    },
    {
        path: 'diagnostics.cacheTrace.includeMessages',
        label: 'Include Messages',
        type: 'boolean',
        description: 'Permits the debugger to physically write user conversational text payloads into the diagnostic JSON files.'
    },
    {
        path: 'diagnostics.cacheTrace.includePrompt',
        label: 'Include Prompt',
        type: 'boolean',
        description: 'Permits the debugger to dump the raw AI System Prompt matrices.'
    },
    {
        path: 'diagnostics.cacheTrace.includeSystem',
        label: 'Include System',
        type: 'boolean',
        description: 'Provides deep AST dumps tracing internal Tool execution bounds.'
    }
];

export default function DiagnosticsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Diagnostics & Tracing Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Enterprise-grade observability constraints governing the OpenTelemetry runtime. Controls exactly how deeply PowerDirector analyzes itself, measures its execution speeds, and exports health metrics to external logging aggregators.</p>
            </div>
            <div className="space-y-6">
                {DIAGNOSTICS_CONFIGS.map((config) => (
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
