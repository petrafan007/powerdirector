// @ts-nocheck
import { spawn } from 'child_process';
import { Provider } from '../reliability/router.ts';
import { CircuitBreaker } from '../reliability/circuit-breaker.ts';
import { getRuntimeLogger } from '../core/logger.ts';

type CliInputMode = 'arg' | 'stdin';
type CodexReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';

export interface CodexCliBackendConfig {
    command?: string;
    args?: string[];
    input?: CliInputMode;
    maxPromptArgChars?: number;
    env?: Record<string, string>;
    clearEnv?: string[];
    modelArg?: string;
    modelAliases?: Record<string, string>;
    defaultReasoningEffort?: CodexReasoningEffort;
    modelReasoningEfforts?: Record<string, CodexReasoningEffort>;
}

type CodexReasoningDecision = {
    value: CodexReasoningEffort;
    source: 'request' | 'model' | 'provider' | 'fallback';
};

export function normalizeCodexCliReasoningEffort(value?: unknown): CodexReasoningEffort | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'xhigh') {
        return normalized;
    }
    if (normalized === 'extra high' || normalized === 'extra-high' || normalized === 'extra_high') {
        return 'xhigh';
    }
    return undefined;
}

function normalizeModelLookupKey(value?: string): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
}

export function summarizeCodexCliStderr(stderr: string): string[] {
    const lines = stderr
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => /(?:\bWARN\b|\bERROR\b|failed|missing|denied|invalid|timed out)/i.test(line));

    if (lines.length === 0) {
        return [];
    }

    const counts = new Map<string, number>();
    const ordered: string[] = [];
    for (const line of lines) {
        const normalized = line.replace(/^\d{4}-\d{2}-\d{2}T\S+\s+/, '');
        if (!counts.has(normalized)) {
            ordered.push(normalized);
            counts.set(normalized, 1);
            continue;
        }
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }

    return ordered.slice(0, 6).map((line) => {
        const count = counts.get(line) || 1;
        return count > 1 ? `${line} (x${count})` : line;
    });
}

/**
 * CodexCLIProvider — wraps OpenAI Codex CLI in headless mode.
 */
export class CodexCLIProvider implements Provider {
    public circuit: CircuitBreaker;
    public config = {
        name: 'openai-codex',
        apiEndpoint: 'cli://codex',
        timeoutMs: 180000
    };

    private model: string;
    private approvalMode: string;
    private runtimeEnv?: NodeJS.ProcessEnv;
    private backendConfig?: CodexCliBackendConfig;

    constructor(
        model: string = 'gpt-5.3-codex',
        approvalMode: string = 'never',
        runtimeEnv?: NodeJS.ProcessEnv,
        backendConfig?: CodexCliBackendConfig
    ) {
        this.circuit = new CircuitBreaker();
        this.model = model;
        this.approvalMode = approvalMode;
        this.runtimeEnv = runtimeEnv;
        this.backendConfig = backendConfig;
    }

    private resolveInputMode(): CliInputMode {
        return this.backendConfig?.input === 'arg' ? 'arg' : 'stdin';
    }

    private resolveModel(model?: string): string {
        const chosen = (typeof model === 'string' && model.trim().length > 0 && model !== 'default' ? model : this.model).trim();
        const aliases = this.backendConfig?.modelAliases || {};
        const alias = aliases[chosen] || aliases[chosen.toLowerCase()];
        if (typeof alias === 'string' && alias.trim().length > 0) {
            return alias.trim();
        }
        return chosen;
    }

    private resolveReasoning(model: string, requested?: unknown): CodexReasoningDecision {
        const explicit = normalizeCodexCliReasoningEffort(requested);
        if (explicit) {
            return { value: explicit, source: 'request' };
        }

        const modelKey = normalizeModelLookupKey(model);
        const modelKeys = modelKey ? [modelKey, `openai-codex/${modelKey}`] : [];
        for (const key of modelKeys) {
            const byModel = this.backendConfig?.modelReasoningEfforts?.[key];
            const modelReasoning = normalizeCodexCliReasoningEffort(byModel);
            if (modelReasoning) {
                return { value: modelReasoning, source: 'model' };
            }
        }

        const providerReasoning = normalizeCodexCliReasoningEffort(this.backendConfig?.defaultReasoningEffort);
        if (providerReasoning) {
            return { value: providerReasoning, source: 'provider' };
        }

        return { value: 'high', source: 'fallback' };
    }

    private resolvePromptArg(prompt: string): string {
        const maxChars = this.backendConfig?.maxPromptArgChars;
        if (typeof maxChars !== 'number' || !Number.isFinite(maxChars) || maxChars <= 0) {
            return prompt;
        }
        return prompt.length > maxChars ? prompt.slice(0, maxChars) : prompt;
    }

    private resolveCommand(): string {
        const configured = this.backendConfig?.command;
        if (typeof configured === 'string' && configured.trim().length > 0) {
            return configured.trim();
        }
        return '/usr/local/bin/codex';
    }

    private buildSpawnEnv(): NodeJS.ProcessEnv {
        const spawnEnv: Record<string, string | undefined> = {
            ...process.env,
            ...(this.runtimeEnv || {}),
            ...(this.backendConfig?.env || {}),
            TERM: 'dumb',
            NO_COLOR: '1'
        };

        for (const key of Array.isArray(this.backendConfig?.clearEnv) ? this.backendConfig!.clearEnv! : []) {
            if (typeof key === 'string' && key.trim()) {
                delete spawnEnv[key.trim()];
            }
        }

        const filtered: Record<string, string> = {};
        for (const [key, value] of Object.entries(spawnEnv)) {
            if (typeof value === 'string') {
                filtered[key] = value;
            }
        }
        return filtered as NodeJS.ProcessEnv;
    }

    private buildArgs(params: {
        prompt: string;
        resolvedModel: string;
        forceUnrestricted: boolean;
        mode: string;
        reasoning: CodexReasoningEffort;
    }): string[] {
        const baseArgs = Array.isArray(this.backendConfig?.args) && this.backendConfig!.args!.length > 0
            ? [...this.backendConfig!.args!]
            : ['exec', '--skip-git-repo-check'];
        const args = [...baseArgs];
        const inputMode = this.resolveInputMode();

        const hasApprovalFlags = args.includes('--dangerously-bypass-approvals-and-sandbox')
            || args.includes('--full-auto')
            || args.includes('--sandbox');
        if (!hasApprovalFlags) {
            if (params.forceUnrestricted) {
                args.push('--dangerously-bypass-approvals-and-sandbox');
            } else if (params.mode === 'interactive' || params.mode === 'manual') {
                args.push('--sandbox', 'workspace-write');
            } else {
                args.push('--full-auto');
            }
        }

        const modelArg = (typeof this.backendConfig?.modelArg === 'string' && this.backendConfig.modelArg.trim().length > 0)
            ? this.backendConfig.modelArg.trim()
            : '--model';
        if (modelArg && !args.includes(modelArg)) {
            args.push(modelArg, params.resolvedModel);
        }

        const reasoningFlag = `model_reasoning_effort=${params.reasoning}`;
        if (!args.includes(reasoningFlag)) {
            args.push('-c', reasoningFlag);
        }

        if (inputMode === 'arg') {
            args.push(this.resolvePromptArg(params.prompt));
        } else {
            const hasStdinMarker = args.includes('-') || args.includes('/dev/stdin');
            if (!hasStdinMarker) {
                args.push('--', '-');
            }
        }

        return args;
    }

    async completion(
        prompt: string,
        model?: string,
        options?: {
            attachments?: any[];
            approvalMode?: string;
            reasoning?: 'low' | 'medium' | 'high' | 'xhigh';
            signal?: AbortSignal;
        }
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const logger = getRuntimeLogger();
            const mode = String(options?.approvalMode || this.approvalMode || 'unrestricted').trim().toLowerCase();
            const forceUnrestricted = mode === 'unrestricted' || mode === 'danger-full-access' || mode === 'yolo';
            const resolvedModel = this.resolveModel(model);
            const reasoning = this.resolveReasoning(resolvedModel, options?.reasoning);
            const inputMode = this.resolveInputMode();
            const command = this.resolveCommand();
            const args = this.buildArgs({
                prompt,
                resolvedModel,
                forceUnrestricted,
                mode,
                reasoning: reasoning.value
            });
            const spawnEnv = this.buildSpawnEnv();

            logger.info(`[CodexCLIProvider] Spawning codex with mode=${forceUnrestricted ? 'unrestricted' : mode || 'full-auto'} model=${resolvedModel} reasoning=${reasoning.value} source=${reasoning.source} input=${inputMode}`);

            const child = spawn(command, args, {
                env: spawnEnv,
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: this.config.timeoutMs,
                cwd: (spawnEnv as any).WORKSPACE_DIR || process.cwd()
            });

            let settled = false;
            let killTimer: NodeJS.Timeout | null = null;
            let abortHandler: (() => void) | null = null;
            const abortError = () => {
                const err = new Error('Codex CLI request aborted');
                err.name = 'AbortError';
                return err;
            };
            const cleanup = () => {
                if (killTimer) {
                    clearTimeout(killTimer);
                    killTimer = null;
                }
                if (abortHandler) {
                    abortHandler();
                    abortHandler = null;
                }
            };
            const settleResolve = (value: string) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(value);
            };
            const settleReject = (error: unknown) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(error);
            };

            if (options?.signal) {
                if (options.signal.aborted) {
                    try { child.kill('SIGKILL'); } catch { }
                    settleReject(abortError());
                    return;
                }
                const onAbort = () => {
                    logger.info('[CodexCLIProvider] Aborting child process due to signal');
                    try { child.kill('SIGTERM'); } catch { }
                    killTimer = setTimeout(() => {
                        try { child.kill('SIGKILL'); } catch { }
                    }, 1000);
                    settleReject(abortError());
                };
                options.signal.addEventListener('abort', onAbort, { once: true });
                abortHandler = () => options.signal?.removeEventListener('abort', onAbort);
            }

            child.stdin.on('error', (err) => logger.error(`[CodexCLIProvider] Stdin error:`, err));

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                logger.info(`[CodexCLIProvider] Process closed with code ${code}`);
                if (settled) {
                    return;
                }
                const diagnostics = summarizeCodexCliStderr(stderr);
                if (diagnostics.length > 0) {
                    logger.warn(`[CodexCLIProvider] stderr diagnostics: ${diagnostics.join(' | ')}`);
                }
                if (code !== 0) {
                    settleReject(new Error(`Codex CLI exited with code ${code}: ${stderr.slice(0, 500) || stdout.trim().slice(-500) || 'Unknown error'}`));
                    return;
                }

                try {
                    const lastBrace = stdout.lastIndexOf('}');
                    const firstBrace = stdout.lastIndexOf('{', lastBrace);
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        const jsonPart = stdout.substring(firstBrace, lastBrace + 1);
                        settleResolve(jsonPart);
                    } else {
                        settleResolve(stdout.trim());
                    }
                } catch {
                    settleResolve(stdout.trim());
                }
            });

            child.on('error', (err) => {
                logger.error(`[CodexCLIProvider] Process error:`, err);
                settleReject(err);
            });

            if (inputMode === 'stdin') {
                child.stdin.write(prompt, () => {
                    child.stdin.end();
                });
            } else {
                child.stdin.end();
            }
        });
    }
}
