// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { getRuntimeLogger } from '../core/logger.ts';
import { Skill, SkillEntry, SkillSnapshot } from './types.js';
import { SkillLoader } from './loader.js';
import { SkillFormatter } from './formatter.js';
import { shouldIncludeSkill } from './config.js';
import { Tool, ToolResult } from '../tools/base.ts';
import { resolveConfigPathCandidate } from '../config/paths.js';


type NodeManager = 'npm' | 'yarn' | 'pnpm';

export interface SkillsConfig {
    install?: {
        nodeManager?: NodeManager;
    };
    entries?: Record<string, SkillEntry>;
}

interface SkillsManagerOptions {
    baseDir?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
}

interface RunnerSpec {
    command: string;
    args: string[];
}

type SkillSource = 'powerdirector-bundled' | 'powerdirector-workspace' | 'powerdirector-plugin';

export interface SkillInfo {
    id: string;
    name: string;
    enabled: boolean;
    installed: boolean;
    hasRunner: boolean;
    dir: string;
    nodeManager: NodeManager;
    description?: string;
    status: 'eligible' | 'blocked' | 'installed' | 'unknown';
    missingBins?: string[];
    source?: string;
    install?: any[]; // Metadata install instructions
    apiKey?: string;
    requiresApiKey?: boolean;
}

export class SkillsManager {
    private readonly logger = getRuntimeLogger();
    private readonly nodeManager: NodeManager;
    private readonly configEntries: Record<string, SkillEntry>;
    private readonly baseDir: string;
    private readonly env?: NodeJS.ProcessEnv;
    private readonly timeoutMs: number;
    private readonly loader: SkillLoader;
    private readonly formatter: SkillFormatter;
    private loadedSkills: Map<string, Skill> = new Map();
    private loadedSkillSources: Map<string, SkillSource> = new Map();
    private binaryCache: Map<string, boolean> = new Map();

    private readonly powerdirectorConfigPath: string;

    constructor(config: SkillsConfig = {}, options: SkillsManagerOptions = {}) {
        this.nodeManager = config.install?.nodeManager || 'npm';
        this.baseDir = options.baseDir || process.cwd();
        this.env = options.env;
        this.timeoutMs = Math.max(1000, options.timeoutMs ?? 30000);
        this.loader = new SkillLoader();
        this.formatter = new SkillFormatter();

        // Initialize PowerDirector config persistence
        this.powerdirectorConfigPath = resolveConfigPathCandidate();

        // Load initial config from both source (passed in) AND powerdirector.config.json
        this.configEntries = { ...config.entries };
        this.loadPersistedConfig();

        this.refresh();
    }

    private loadPersistedConfig() {
        if (fs.existsSync(this.powerdirectorConfigPath)) {
            try {
                const content = fs.readFileSync(this.powerdirectorConfigPath, 'utf8');
                const parsed = JSON.parse(content);
                if (parsed.skills) {
                    for (const [id, entry] of Object.entries(parsed.skills)) {
                        const existing = this.configEntries[id] || {};
                        this.configEntries[id] = {
                            ...existing,
                            ...entry as any
                        };
                    }
                }
            } catch (e) {
                this.logger.error('Failed to load powerdirector.config.json', e);
            }
        }
    }

    public refresh() {
        this.loadedSkills.clear();
        this.loadedSkillSources.clear();
        this.binaryCache.clear();
        const sources = this.resolveSkillDiscoverySources();
        for (const source of sources) {
            const skills = this.loader.loadSkillsFromDir(source.dir);
            for (const skill of skills) {
                // Later sources intentionally override earlier ones.
                this.loadedSkills.set(skill.name, skill);
                this.loadedSkillSources.set(skill.name, source.source);
            }
        }
    }

    private pushDiscoverySource(
        sources: Array<{ dir: string; source: SkillSource }>,
        seen: Set<string>,
        dir: string,
        source: SkillSource
    ) {
        const resolved = path.resolve(dir);
        if (seen.has(resolved) || !fs.existsSync(resolved)) {
            return;
        }
        try {
            if (!fs.statSync(resolved).isDirectory()) {
                return;
            }
        } catch {
            return;
        }
        seen.add(resolved);
        sources.push({ dir: resolved, source });
    }

    private collectExtensionSkillDirs(extensionsRoot: string): string[] {
        if (!fs.existsSync(extensionsRoot)) {
            return [];
        }
        let entries: fs.Dirent[] = [];
        try {
            entries = fs.readdirSync(extensionsRoot, { withFileTypes: true });
        } catch {
            return [];
        }
        const out: string[] = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const skillsDir = path.join(extensionsRoot, entry.name, 'skills');
            if (fs.existsSync(skillsDir)) {
                out.push(skillsDir);
            }
        }
        return out;
    }

    private resolveSkillDiscoverySources(): Array<{ dir: string; source: SkillSource }> {
        const sources: Array<{ dir: string; source: SkillSource }> = [];
        const seen = new Set<string>();

        const bundledRoots = [
            path.join(this.baseDir, 'src', 'skills'),
            path.join(this.baseDir, 'skills'),
        ];
        for (const dir of bundledRoots) {
            this.pushDiscoverySource(sources, seen, dir, 'powerdirector-bundled');
        }

        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const extensionRoots = [
            path.join(this.baseDir, 'extensions'),
            path.join(this.baseDir, '.powerdirector', 'extensions'),
            homeDir ? path.join(homeDir, '.powerdirector', 'extensions') : '',
        ].filter(Boolean);
        for (const root of extensionRoots) {
            const skillDirs = this.collectExtensionSkillDirs(root);
            for (const dir of skillDirs) {
                this.pushDiscoverySource(sources, seen, dir, 'powerdirector-plugin');
            }
        }

        const workspaceRoots = [
            homeDir ? path.join(homeDir, '.powerdirector', 'skills') : '',
            path.join(this.baseDir, '.agents', 'skills'),
            homeDir ? path.join(homeDir, '.agents', 'skills') : '',
        ].filter(Boolean);
        for (const dir of workspaceRoots) {
            this.pushDiscoverySource(sources, seen, dir, 'powerdirector-workspace');
        }

        return sources;
    }

    public list(): SkillInfo[] {
        return Array.from(this.loadedSkills.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((skill) => this.describe(skill.name));
    }

    public isEnabled(skillId: string): boolean {
        const skill = this.loadedSkills.get(skillId);
        if (!skill) return false;

        // Check config override
        const configEntry = this.configEntries[skillId];
        if (configEntry && configEntry.enabled === false) return false;

        // Check if blocked by missing binaries
        const status = this.checkStatus(skill);
        if (status.status === 'blocked') return false;

        return true;
    }

    public getSkillsPrompt(): string {
        const enabledSkills = Array.from(this.loadedSkills.values())
            .filter(s => this.isEnabled(s.name));

        // Pass to formatter - formatter might need updating to handle SKILL.md content
        // For now, we reuse the existing formatter but ensure it gets the full skill object
        return this.formatter.formatSkillsForPrompt(enabledSkills);
    }

    public getTools(): Tool[] {
        return Array.from(this.loadedSkills.values())
            .filter(skill => this.isEnabled(skill.name) && this.resolveRunner(skill.baseDir))
            .map(skill => new SkillBridgeTool(skill, this));
    }

    public async run(skillId: string, input: string = ''): Promise<string> {
        const skill = this.loadedSkills.get(skillId);
        if (!skill) {
            throw new Error(`Skill "${skillId}" not found.`);
        }

        if (!this.isEnabled(skillId)) {
            const status = this.checkStatus(skill);
            if (status.status === 'blocked') {
                throw new Error(`Skill "${skillId}" is blocked. Missing binaries: ${status.missing?.join(', ') || 'unknown'}`);
            }
            throw new Error(`Skill "${skillId}" is disabled by settings.`);
        }

        const runner = this.resolveRunner(skill.baseDir);
        if (!runner) {
            // Knowledge skills don't have runners, they are "run" by the agent understanding the prompt.
            // If the user tries to /skill run it manually, we should probably output the help/usage from SKILL.md
            // or throw an error saying it's a knowledge skill.
            return `Skill "${skillId}" is a Knowledge Skill (no executable script). It provides tools/knowledge to the Agent automatically when enabled.`;
        }

        const configEntry = this.configEntries[skillId] || {};
        return this.executeRunner(skillId, skill.baseDir, runner, configEntry, input);
    }

    public async installSkill(skillId: string): Promise<{ success: boolean; message: string }> {
        const skill = this.loadedSkills.get(skillId);
        if (!skill) throw new Error(`Skill ${skillId} not found`);

        const installInstructions = skill.frontmatter?.metadata?.powerdirector?.install;
        if (!installInstructions || installInstructions.length === 0) {
            return { success: false, message: 'No installation instructions found.' };
        }

        // Prefer brew, then go, then generic
        const instruction = installInstructions.find(i => i.id === 'brew')
            || installInstructions.find(i => i.kind === 'go')
            || installInstructions[0];

        let cmd = '';
        let args: string[] = [];

        if (instruction.kind === 'brew' && instruction.formula) {
            cmd = 'brew';
            args = ['install', instruction.formula];
        } else if (instruction.kind === 'go' && instruction.module) {
            cmd = 'go';
            // "go install <module>"
            args = ['install', instruction.module];
        } else {
            return { success: false, message: `Unsupported install kind: ${instruction.kind}` };
        }

        return new Promise((resolve) => {
            if (!this.hasBinary(cmd)) {
                resolve({ success: false, message: `Command "${cmd}" not found. Please install ${cmd} locally first.` });
                return;
            }

            this.logger.info(`Installing skill ${skillId}: ${cmd} ${args.join(' ')}`);
            const child = spawn(cmd, args, {
                stdio: 'pipe',
                env: this.getAugmentedEnv()
            });

            let output = '';
            if (child.stdout) child.stdout.on('data', d => output += d.toString());
            if (child.stderr) child.stderr.on('data', d => output += d.toString());

            child.on('error', (err) => {
                resolve({ success: false, message: `Failed to start installation process: ${err.message}` });
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.binaryCache.clear();
                    this.refresh(); // Refresh status check
                    resolve({ success: true, message: 'Installation successful.' });
                } else {
                    resolve({ success: false, message: `Installation failed (exit code ${code}): ${output}` });
                }
            });
        });
    }

    public async updateSkillConfig(skillId: string, enabled?: boolean, apiKey?: string): Promise<void> {
        if (!this.configEntries[skillId]) {
            this.configEntries[skillId] = {
                skill: this.loadedSkills.get(skillId)! // Should exist if we are updating it
            };
        }

        if (enabled !== undefined) {
            this.configEntries[skillId].enabled = enabled;
        }
        if (apiKey !== undefined) {
            this.configEntries[skillId].apiKey = apiKey;
        }

        // Persist to ~/.powerdirector/powerdirector.config.json
        try {
            const dir = path.dirname(this.powerdirectorConfigPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            let currentConfig: any = {};
            if (fs.existsSync(this.powerdirectorConfigPath)) {
                try {
                    currentConfig = JSON.parse(fs.readFileSync(this.powerdirectorConfigPath, 'utf8'));
                } catch (e) { /* ignore corrupt config */ }
            }

            if (!currentConfig.skills) currentConfig.skills = {};

            // Only save fields that differ from default or are explicitly set
            const entry: any = currentConfig.skills[skillId] || {};
            if (enabled !== undefined) entry.enabled = enabled;
            if (apiKey !== undefined) entry.apiKey = apiKey;

            currentConfig.skills[skillId] = entry;

            fs.writeFileSync(this.powerdirectorConfigPath, JSON.stringify(currentConfig, null, 2));
        } catch (error) {
            this.logger.error('Failed to persist skill config', error);
        }
    }

    private describe(skillId: string): SkillInfo {
        const skill = this.loadedSkills.get(skillId);
        if (!skill) {
            return {
                id: skillId,
                name: skillId,
                enabled: false,
                installed: false,
                hasRunner: false,
                dir: '',
                nodeManager: this.nodeManager,
                status: 'unknown',
                source: 'unknown',
                requiresApiKey: false
            };
        }

        const hasRunner = Boolean(this.resolveRunner(skill.baseDir));
        const statusCheck = this.checkStatus(skill);
        const enabled = this.isEnabled(skillId);

        // Configured API key
        const apiKey = this.configEntries[skillId]?.apiKey;

        // Use explicit discovery source instead of path heuristics.
        const source = this.loadedSkillSources.get(skillId) || 'powerdirector-workspace';

        // Install instructions
        const install = skill.frontmatter?.metadata?.powerdirector?.install;

        // Determine if API key is required
        const powerdirectorMeta = skill.frontmatter?.metadata?.powerdirector;
        const requiresApiKey = Boolean(
            powerdirectorMeta?.primaryEnv ||
            (powerdirectorMeta?.requires?.env && powerdirectorMeta.requires.env.length > 0)
        );

        return {
            id: skill.name,
            name: skill.name, // Use same as id for now, or fetch usage name if different
            enabled,
            installed: true,
            hasRunner,
            dir: skill.baseDir,
            nodeManager: this.nodeManager,
            description: skill.description,
            status: statusCheck.status,
            missingBins: statusCheck.missing,
            source,
            install,
            apiKey,
            requiresApiKey
        };
    }

    private checkStatus(skill: Skill): { status: 'eligible' | 'blocked' | 'installed', missing?: string[] } {
        // 1. Check required binaries from frontmatter
        const requires = skill.frontmatter?.metadata?.powerdirector?.requires;

        if (requires && requires.bins && Array.isArray(requires.bins)) {
            const missing: string[] = [];
            for (const bin of requires.bins) {
                if (!this.hasBinary(bin)) {
                    missing.push(bin);
                }
            }
            if (missing.length > 0) {
                return { status: 'blocked', missing };
            }
        }

        // If it has a runner, it's installed/executable. If not, it's eligible (pure knowledge).
        // PowerDirector uses 'eligible' for skills that CAN be used/installed.
        // If it's a workspace skill (custom), it might be 'installed'.
        // For parity with screenshots, let's use 'eligible' as default for valid skills.
        return { status: 'eligible' };
    }

    private hasBinary(bin: string): boolean {
        if (this.binaryCache.has(bin)) {
            return this.binaryCache.get(bin)!;
        }

        try {
            const result = spawnSync('which', [bin], {
                encoding: 'utf-8',
                env: this.getAugmentedEnv()
            });
            const exists = result.status === 0;
            this.binaryCache.set(bin, exists);
            return exists;
        } catch {
            this.binaryCache.set(bin, false);
            return false;
        }
    }

    private getAugmentedEnv(): NodeJS.ProcessEnv {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const goBin = homeDir ? path.join(homeDir, 'go', 'bin') : '';
        const homeLocalBin = homeDir ? path.join(homeDir, '.local', 'bin') : '';

        const extraPaths = [
            goBin,
            homeLocalBin,
            '/usr/local/bin',
            '/opt/homebrew/bin',
            '/home/linuxbrew/.linuxbrew/bin'
        ].filter(p => p && fs.existsSync(p));

        const currentPath = process.env.PATH || '';
        const newPath = [...extraPaths, currentPath].join(path.delimiter);

        return {
            ...process.env,
            ...(this.env || {}),
            PATH: newPath
        };
    }

    private resolveRunner(skillDir: string): RunnerSpec | null {
        // ... (existing implementation)
        const runSh = path.join(skillDir, 'run.sh');
        if (fs.existsSync(runSh)) {
            return { command: '/bin/sh', args: [runSh] };
        }

        const runJs = path.join(skillDir, 'run.js');
        if (fs.existsSync(runJs)) {
            return { command: 'node', args: [runJs] };
        }

        const runCjs = path.join(skillDir, 'run.cjs');
        if (fs.existsSync(runCjs)) {
            return { command: 'node', args: [runCjs] };
        }

        const runMjs = path.join(skillDir, 'run.mjs');
        if (fs.existsSync(runMjs)) {
            return { command: 'node', args: [runMjs] };
        }

        const pkgJson = path.join(skillDir, 'package.json');
        if (fs.existsSync(pkgJson)) {
            if (this.nodeManager === 'yarn') {
                return { command: 'yarn', args: ['-s', 'skill'] };
            }
            return { command: this.nodeManager, args: ['run', '-s', 'skill'] };
        }

        return null;
    }

    private async executeRunner(
        skillId: string,
        skillDir: string,
        runner: RunnerSpec,
        entry: SkillEntry,
        input: string
    ): Promise<string> {
        // ... (existing implementation)
        return new Promise<string>((resolve, reject) => {
            const augmentedEnv = this.getAugmentedEnv();
            const child = spawn(runner.command, runner.args, {
                cwd: skillDir,
                env: {
                    ...augmentedEnv,
                    PD_SKILL_ID: skillId,
                    PD_SKILL_INPUT: String(input || ''),
                    PD_SKILL_CONFIG: JSON.stringify(entry.config || {}),
                    PD_SKILL_API_KEY: String(entry.apiKey || ''),
                    PD_SKILL_NODE_MANAGER: this.nodeManager,
                    // Also set GEMINI_API_KEY from entry.apiKey if it's a gemini skill and not already set
                    ...(skillId.includes('banana') && !augmentedEnv.GEMINI_API_KEY ? {
                        GEMINI_API_KEY: String(entry.apiKey || '')
                    } : {})
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
                reject(new Error(`Skill "${skillId}" timed out after ${this.timeoutMs}ms.`));
            }, this.timeoutMs);

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });

            child.on('close', (code) => {
                clearTimeout(timer);
                if (code !== 0) {
                    const message = stderr.trim() || stdout.trim() || `exit code ${code}`;
                    reject(new Error(`Skill "${skillId}" failed: ${message}`));
                    return;
                }

                const output = stdout.trim() || '(no output)';
                resolve(output);
            });
        }).catch((error) => {
            this.logger.error(`Skill run failed for "${skillId}":`, error);
            throw error;
        });
    }
}

class SkillBridgeTool implements Tool {
    public name: string;
    public description: string;
    public parameters = {
        type: 'object',
        properties: {
            input: { type: 'string', description: 'Input/prompt to pass to the skill' }
        },
        required: ['input']
    };

    constructor(private skill: Skill, private manager: SkillsManager) {
        // LLM tools typically use underscores, skills use hyphens.
        this.name = skill.name.replace(/-/g, '_');
        this.description = skill.description || `Execute the ${skill.name} skill.`;
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            const output = await this.manager.run(this.skill.name, args.input || '');
            return { output };
        } catch (error: any) {
            return { output: error.message, isError: true };
        }
    }
}
