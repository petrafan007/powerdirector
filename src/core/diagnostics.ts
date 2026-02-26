// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { getRuntimeLogger } from './logger.ts';

export interface DiagnosticsOtelConfig {
    enabled?: boolean;
    endpoint?: string;
    protocol?: 'http/protobuf' | 'grpc';
    headers?: Record<string, string>;
    serviceName?: string;
    traces?: boolean;
    metrics?: boolean;
    logs?: boolean;
    sampleRate?: number;
    flushIntervalMs?: number;
}

export interface DiagnosticsCacheTraceConfig {
    enabled?: boolean;
    filePath?: string;
    includeMessages?: boolean;
    includePrompt?: boolean;
    includeSystem?: boolean;
}

export interface DiagnosticsConfig {
    enabled?: boolean;
    flags?: string[];
    otel?: DiagnosticsOtelConfig;
    cacheTrace?: DiagnosticsCacheTraceConfig;
}

export class DiagnosticsManager {
    private readonly enabled: boolean;
    private readonly flags: string[];
    private readonly otel: DiagnosticsOtelConfig;
    private readonly cacheTrace: DiagnosticsCacheTraceConfig;
    private readonly otelEnabled: boolean;
    private readonly cacheTraceEnabled: boolean;
    private readonly otelTracePath: string;
    private readonly cacheTracePath: string;
    private readonly logger = getRuntimeLogger();

    constructor(config: DiagnosticsConfig = {}, baseDir: string = process.cwd()) {
        this.enabled = config.enabled ?? false;
        this.flags = Array.isArray(config.flags)
            ? [...new Set(config.flags.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim()))]
            : [];
        this.otel = { ...(config.otel || {}) };
        this.cacheTrace = { ...(config.cacheTrace || {}) };
        this.otelEnabled = this.enabled && (this.otel.enabled ?? false);
        this.cacheTraceEnabled = this.enabled && (this.cacheTrace.enabled ?? false);
        this.otelTracePath = path.join(baseDir, 'diagnostics', 'otel.ndjson');
        this.cacheTracePath = this.resolveCacheTracePath(baseDir, this.cacheTrace.filePath);
    }

    public start(): void {
        if (!this.enabled) {
            this.logger.info('Diagnostics disabled by settings.');
            return;
        }

        if (this.otelEnabled) this.ensureDirectory(path.dirname(this.otelTracePath));
        if (this.cacheTraceEnabled) this.ensureDirectory(path.dirname(this.cacheTracePath));

        this.logger.info(
            `Diagnostics started (flags=${this.flags.length}, otel=${this.otelEnabled}, cacheTrace=${this.cacheTraceEnabled}).`
        );
        this.recordEvent('diagnostics.started', {
            flags: this.flags,
            otel: this.otelEnabled
                ? {
                    endpoint: this.otel.endpoint ?? '',
                    protocol: this.otel.protocol ?? 'http/protobuf',
                    serviceName: this.otel.serviceName ?? ''
                }
                : undefined,
            cacheTrace: this.cacheTraceEnabled
        });
    }

    public stop(): void {
        // No long-running handles are registered by diagnostics manager today.
    }

    public isFlagEnabled(flag: string): boolean {
        if (!this.enabled || !flag) return false;
        if (this.flags.includes('*')) return true;
        for (const configured of this.flags) {
            if (configured === flag) return true;
            if (configured.endsWith('.*')) {
                const prefix = configured.slice(0, -2);
                if (prefix.length > 0 && flag.startsWith(`${prefix}.`)) return true;
            }
        }
        return false;
    }

    public recordEvent(event: string, payload: Record<string, unknown> = {}): void {
        if (!this.enabled) return;

        const entry = {
            ts: new Date().toISOString(),
            event,
            payload
        };

        if (this.otelEnabled) {
            this.appendLine(this.otelTracePath, {
                ...entry,
                otel: {
                    endpoint: this.otel.endpoint ?? '',
                    protocol: this.otel.protocol ?? 'http/protobuf',
                    serviceName: this.otel.serviceName ?? ''
                }
            });
        }

        if (this.cacheTraceEnabled) {
            this.appendLine(this.cacheTracePath, {
                ...entry,
                payload: this.applyCacheTraceFilters(payload)
            });
        }
    }

    public getStatus(): {
        enabled: boolean;
        flags: string[];
        otel: DiagnosticsOtelConfig & { tracePath: string; active: boolean };
        cacheTrace: DiagnosticsCacheTraceConfig & { tracePath: string; active: boolean };
    } {
        return {
            enabled: this.enabled,
            flags: [...this.flags],
            otel: {
                ...this.otel,
                active: this.otelEnabled,
                tracePath: this.otelTracePath
            },
            cacheTrace: {
                ...this.cacheTrace,
                active: this.cacheTraceEnabled,
                tracePath: this.cacheTracePath
            }
        };
    }

    private resolveCacheTracePath(baseDir: string, filePath?: string): string {
        if (typeof filePath === 'string' && filePath.trim().length > 0) {
            if (path.isAbsolute(filePath)) return filePath;
            return path.join(baseDir, filePath);
        }
        return path.join(baseDir, 'diagnostics', 'cache-trace.ndjson');
    }

    private ensureDirectory(dir: string): void {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        } catch (error) {
            this.logger.error('Failed to ensure diagnostics directory:', error);
        }
    }

    private appendLine(filePath: string, payload: Record<string, unknown>): void {
        try {
            fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf-8');
        } catch (error) {
            this.logger.error(`Failed to write diagnostics event to ${filePath}:`, error);
        }
    }

    private applyCacheTraceFilters(payload: Record<string, unknown>): Record<string, unknown> {
        const filtered: Record<string, unknown> = { ...payload };
        if (this.cacheTrace.includeMessages === false) {
            delete filtered.messages;
            delete filtered.message;
        }
        if (this.cacheTrace.includePrompt === false) {
            delete filtered.prompt;
        }
        if (this.cacheTrace.includeSystem === false) {
            delete filtered.system;
        }
        return filtered;
    }
}
