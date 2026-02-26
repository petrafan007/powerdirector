// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getRuntimeLogger } from '../core/logger.ts';

interface PluginEntry {
    enabled?: boolean;
    config?: Record<string, any>;
}

export interface PluginsConfig {
    entries?: Record<string, PluginEntry>;
}

interface PluginsManagerOptions {
    baseDir?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
}

interface RunnerSpec {
    command: string;
    args: string[];
}

interface LoadedPluginInfo {
    id: string;
    loaded: boolean;
    reason?: string;
}

export interface PluginInfo {
    id: string;
    enabled: boolean;
    installed: boolean;
    loaded: boolean;
    hasRunner: boolean;
    dir: string;
}

interface PluginModuleContract {
    onLoad?: (context: { pluginId: string; config: Record<string, any> }) => unknown;
}

function normalizeString(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
}

export class PluginsManager {
    private readonly logger = getRuntimeLogger();
    private readonly entries: Record<string, PluginEntry>;
    private readonly baseDir: string;
    private readonly env?: NodeJS.ProcessEnv;
    private readonly timeoutMs: number;
    private readonly loadedById = new Map<string, LoadedPluginInfo>();

    constructor(config: PluginsConfig = {}, options: PluginsManagerOptions = {}) {
        this.entries = config.entries || {};
        this.baseDir = options.baseDir || process.cwd();
        this.env = options.env;
        this.timeoutMs = Math.max(1000, options.timeoutMs ?? 30000);
    }

    public initialize(): void {
        this.loadedById.clear();
        for (const pluginId of Object.keys(this.entries)) {
            const normalized = this.normalizePluginId(pluginId);
            if (!normalized) continue;
            if (!this.isEnabled(normalized)) {
                this.loadedById.set(normalized, { id: normalized, loaded: false, reason: 'disabled' });
                continue;
            }
            const loaded = this.loadPluginModule(normalized);
            this.loadedById.set(normalized, loaded);
        }
    }

    public list(): PluginInfo[] {
        return Object.keys(this.entries)
            .sort((a, b) => a.localeCompare(b))
            .map((id) => this.describe(id));
    }

    public isEnabled(pluginId: string): boolean {
        const normalized = this.normalizePluginId(pluginId);
        if (!normalized) return false;
        const entry = this.entries[normalized];
        if (!entry) return false;
        return entry.enabled !== false;
    }

    public async run(pluginId: string, input: string = ''): Promise<string> {
        const normalized = this.normalizePluginId(pluginId);
        if (!normalized) throw new Error('Plugin id is required.');
        if (!this.entries[normalized]) throw new Error(`Plugin "${normalized}" is not configured.`);
        if (!this.isEnabled(normalized)) throw new Error(`Plugin "${normalized}" is disabled by settings.`);

        const info = this.describe(normalized);
        if (!info.installed) throw new Error(`Plugin "${normalized}" is not installed at ${info.dir}.`);

        const runner = this.resolveRunner(info.dir);
        if (!runner) throw new Error(`Plugin "${normalized}" has no runnable entrypoint.`);

        const entry = this.entries[normalized] || {};
        return this.executeRunner(normalized, runner, entry, input);
    }

    private describe(pluginId: string): PluginInfo {
        const normalized = this.normalizePluginId(pluginId);
        const dir = this.resolvePluginDir(normalized);
        const installed = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
        const hasRunner = installed && Boolean(this.resolveRunner(dir));
        const loaded = this.loadedById.get(normalized)?.loaded === true;
        return {
            id: normalized,
            enabled: this.entries[normalized]?.enabled !== false,
            installed,
            loaded,
            hasRunner,
            dir
        };
    }

    private resolvePluginDir(pluginId: string): string {
        return path.join(this.baseDir, 'plugins', pluginId);
    }

    private resolveRunner(pluginDir: string): RunnerSpec | null {
        const runSh = path.join(pluginDir, 'run.sh');
        if (fs.existsSync(runSh)) return { command: '/bin/sh', args: [runSh] };

        const runJs = path.join(pluginDir, 'run.js');
        if (fs.existsSync(runJs)) return { command: 'node', args: [runJs] };

        const runCjs = path.join(pluginDir, 'run.cjs');
        if (fs.existsSync(runCjs)) return { command: 'node', args: [runCjs] };

        const runMjs = path.join(pluginDir, 'run.mjs');
        if (fs.existsSync(runMjs)) return { command: 'node', args: [runMjs] };

        return null;
    }

    private loadPluginModule(pluginId: string): LoadedPluginInfo {
        const dir = this.resolvePluginDir(pluginId);
        const modulePath = path.join(dir, 'index.js');
        if (!fs.existsSync(modulePath)) {
            return { id: pluginId, loaded: false, reason: 'index.js not found' };
        }

        try {
            // Use runtime require indirection so bundlers do not try to statically resolve plugin paths.
            const dynamicRequire = (new Function('return require'))() as NodeRequire;
            const mod = dynamicRequire(modulePath) as PluginModuleContract;
            if (typeof mod?.onLoad === 'function') {
                const entry = this.entries[pluginId] || {};
                mod.onLoad({
                    pluginId,
                    config: entry.config || {}
                });
            }
            return { id: pluginId, loaded: true };
        } catch (error: any) {
            this.logger.error(`Failed to load plugin "${pluginId}":`, error);
            return { id: pluginId, loaded: false, reason: error.message || String(error) };
        }
    }

    private normalizePluginId(pluginId: string): string {
        const normalized = normalizeString(pluginId);
        if (!normalized) return '';
        if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) return '';
        return normalized;
    }

    private async executeRunner(
        pluginId: string,
        runner: RunnerSpec,
        entry: PluginEntry,
        input: string
    ): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const child = spawn(runner.command, runner.args, {
                cwd: this.resolvePluginDir(pluginId),
                env: {
                    ...(process.env || {}),
                    ...(this.env || {}),
                    PD_PLUGIN_ID: pluginId,
                    PD_PLUGIN_INPUT: String(input || ''),
                    PD_PLUGIN_CONFIG: this.stringify(entry.config || {})
                },
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (chunk: Buffer) => {
                stdout += chunk.toString('utf-8');
            });
            child.stderr.on('data', (chunk: Buffer) => {
                stderr += chunk.toString('utf-8');
            });

            const timer = setTimeout(() => {
                child.kill('SIGKILL');
                reject(new Error(`Plugin "${pluginId}" timed out after ${this.timeoutMs}ms.`));
            }, this.timeoutMs);

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });

            child.on('close', (code) => {
                clearTimeout(timer);
                if (code !== 0) {
                    const message = stderr.trim() || stdout.trim() || `exit code ${code}`;
                    reject(new Error(`Plugin "${pluginId}" failed: ${message}`));
                    return;
                }
                resolve(stdout.trim() || '(no output)');
            });
        });
    }

    private stringify(value: Record<string, any>): string {
        try {
            return JSON.stringify(value);
        } catch {
            return '{}';
        }
    }
}
