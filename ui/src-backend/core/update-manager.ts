// @ts-nocheck
import { execFile } from 'node:child_process';
import util from 'node:util';
import { getRuntimeLogger } from './logger.js';

const execFileAsync = util.promisify(execFile);

type UpdateChannel = 'stable' | 'beta' | 'nightly';
type DistTag = 'latest' | 'beta' | 'next';

export interface UpdateConfig {
    channel?: UpdateChannel;
    checkOnStart?: boolean;
    autoInstall?: boolean;
}

interface UpdateManagerOptions {
    packageName?: string;
    currentVersion?: string;
    cwd?: string;
    scriptPath?: string;
    checkTimeoutMs?: number;
    installTimeoutMs?: number;
    commandRunner?: (args: string[], timeoutMs: number) => Promise<{ stdout: string; stderr: string }>;
}

export interface UpdateStartupResult {
    checked: boolean;
    channel: UpdateChannel;
    distTag: DistTag;
    currentVersion: string;
    latestVersion?: string;
    updateAvailable: boolean;
    installed: boolean;
    reason?: string;
}

interface ParsedSemver {
    major: number;
    minor: number;
    patch: number;
    pre: string | null;
}

function parseSemver(raw: string): ParsedSemver | null {
    const match = String(raw || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) return null;
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        pre: match[4] || null
    };
}

function compareSemver(a: string, b: string): number {
    const av = parseSemver(a);
    const bv = parseSemver(b);

    if (!av || !bv) {
        return a.localeCompare(b);
    }

    if (av.major !== bv.major) return av.major > bv.major ? 1 : -1;
    if (av.minor !== bv.minor) return av.minor > bv.minor ? 1 : -1;
    if (av.patch !== bv.patch) return av.patch > bv.patch ? 1 : -1;

    if (av.pre && !bv.pre) return -1;
    if (!av.pre && bv.pre) return 1;
    if (!av.pre && !bv.pre) return 0;
    if (av.pre === bv.pre) return 0;

    return (av.pre || '').localeCompare(bv.pre || '');
}

function channelToDistTag(channel: UpdateChannel): DistTag {
    if (channel === 'beta') return 'beta';
    if (channel === 'nightly') return 'next';
    return 'latest';
}

export class UpdateManager {
    private readonly config: Required<UpdateConfig>;
    private readonly packageName: string;
    private readonly currentVersion: string;
    private readonly cwd: string;
    private readonly scriptPath: string;
    private readonly checkTimeoutMs: number;
    private readonly installTimeoutMs: number;
    private readonly commandRunner?: (args: string[], timeoutMs: number) => Promise<{ stdout: string; stderr: string }>;
    private readonly logger = getRuntimeLogger();

    constructor(config: UpdateConfig = {}, options: UpdateManagerOptions = {}) {
        this.config = {
            channel: config.channel || 'stable',
            checkOnStart: config.checkOnStart !== false,
            autoInstall: config.autoInstall === true
        };
        this.packageName = options.packageName || 'powerdirector';
        this.currentVersion = options.currentVersion || '0.0.0';
        this.cwd = options.cwd || process.cwd();
        this.scriptPath = options.scriptPath || process.argv[1] || '';
        this.checkTimeoutMs = Math.max(1000, options.checkTimeoutMs ?? 8000);
        this.installTimeoutMs = Math.max(1000, options.installTimeoutMs ?? 120000);
        this.commandRunner = options.commandRunner;
    }

    public async runStartupCheck(): Promise<UpdateStartupResult> {
        const distTag = channelToDistTag(this.config.channel);

        if (!this.config.checkOnStart) {
            return {
                checked: false,
                channel: this.config.channel,
                distTag,
                currentVersion: this.currentVersion,
                updateAvailable: false,
                installed: false,
                reason: 'checkOnStart disabled'
            };
        }

        let latestVersion: string;
        try {
            latestVersion = await this.fetchLatestVersion(distTag);
        } catch (error: any) {
            const reason = `update check failed: ${error.message}`;
            this.logger.warn(reason);
            return {
                checked: true,
                channel: this.config.channel,
                distTag,
                currentVersion: this.currentVersion,
                updateAvailable: false,
                installed: false,
                reason
            };
        }

        const updateAvailable = compareSemver(latestVersion, this.currentVersion) > 0;
        if (!updateAvailable) {
            return {
                checked: true,
                channel: this.config.channel,
                distTag,
                currentVersion: this.currentVersion,
                latestVersion,
                updateAvailable: false,
                installed: false
            };
        }

        if (!this.config.autoInstall) {
            this.logger.info(`Update available: ${this.currentVersion} -> ${latestVersion} (${distTag}).`);
            return {
                checked: true,
                channel: this.config.channel,
                distTag,
                currentVersion: this.currentVersion,
                latestVersion,
                updateAvailable: true,
                installed: false,
                reason: 'autoInstall disabled'
            };
        }

        const installResult = await this.tryAutoInstall(distTag, latestVersion);
        return {
            checked: true,
            channel: this.config.channel,
            distTag,
            currentVersion: this.currentVersion,
            latestVersion,
            updateAvailable: true,
            installed: installResult.ok,
            reason: installResult.reason
        };
    }

    private async fetchLatestVersion(distTag: DistTag): Promise<string> {
        const { stdout } = await this.runNpm(['view', `${this.packageName}@${distTag}`, 'version', '--json'], this.checkTimeoutMs);
        const parsed = this.parseVersionFromNpmOutput(stdout);
        if (!parsed) {
            throw new Error('could not parse latest version from npm output');
        }
        return parsed;
    }

    private parseVersionFromNpmOutput(stdout: string): string | null {
        const trimmed = String(stdout || '').trim();
        if (!trimmed) return null;

        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === 'string') {
                return parsed.trim() || null;
            }
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
                return parsed[0].trim() || null;
            }
        } catch {
            // fall through and attempt plain-text parse.
        }

        const plain = trimmed.replace(/^"+|"+$/g, '').trim();
        return plain || null;
    }

    private async tryAutoInstall(distTag: DistTag, latestVersion: string): Promise<{ ok: boolean; reason?: string }> {
        if (!this.isGlobalNpmInstall()) {
            const reason = 'autoInstall requested but unsupported in source checkout/runtime.';
            this.logger.warn(reason);
            return { ok: false, reason };
        }

        try {
            await this.runNpm(['install', '-g', `${this.packageName}@${distTag}`], this.installTimeoutMs);
            this.logger.info(`Auto-installed ${this.packageName}@${distTag} (${latestVersion}).`);
            return { ok: true };
        } catch (error: any) {
            const reason = `autoInstall failed: ${error.message}`;
            this.logger.error(reason);
            return { ok: false, reason };
        }
    }

    private isGlobalNpmInstall(): boolean {
        const normalized = String(this.scriptPath || '').replace(/\\/g, '/');
        const globalPaths = [
            `/lib/node_modules/${this.packageName}/`,
            `/AppData/Roaming/npm/node_modules/${this.packageName}/`
        ];
        return globalPaths.some((segment) => normalized.includes(segment));
    }

    private async runNpm(args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
        if (this.commandRunner) {
            return this.commandRunner(args, timeoutMs);
        }

        const { stdout, stderr } = await execFileAsync('npm', args, {
            cwd: this.cwd,
            timeout: timeoutMs
        });

        return {
            stdout: String(stdout || ''),
            stderr: String(stderr || '')
        };
    }
}
