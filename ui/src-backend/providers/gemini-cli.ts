// @ts-nocheck
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Provider } from '../reliability/router.ts';
import { CircuitBreaker } from '../reliability/circuit-breaker.ts';
import { getRuntimeLogger } from '../core/logger.ts';

type CliInputMode = 'arg' | 'stdin';

type StreamResolver = {
    resolve: (value: IteratorResult<string>) => void;
    reject: (error: unknown) => void;
};

export interface GeminiCliBackendConfig {
    command?: string;
    args?: string[];
    output?: 'json' | 'text' | 'jsonl';
    input?: CliInputMode;
    maxPromptArgChars?: number;
    env?: Record<string, string>;
    clearEnv?: string[];
    modelArg?: string;
    modelAliases?: Record<string, string>;
    imageArg?: string;
    imageMode?: 'repeat' | 'list';
}

export function summarizeGeminiCliStderr(stderr: string): string[] {
    const lines = stderr
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => /(?:429|capacity|retry|resource_exhausted|failed|error|quota|unavailable)/i.test(line));

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

function buildNoOutputError(stderr: string, diagnostics: string[]): Error {
    const details = diagnostics.length > 0
        ? diagnostics.join(' | ')
        : (stderr.trim().slice(-500) || 'Gemini CLI exited successfully but produced no output.');
    return new Error(`Gemini CLI produced no output: ${details}`);
}

function createAbortError(): Error {
    const err = new Error('Gemini CLI request aborted');
    err.name = 'AbortError';
    return err;
}

/**
 * GeminiCLIProvider — wraps @google/gemini-cli using system OAuth.
 */
export class GeminiCLIProvider implements Provider {
    public circuit: CircuitBreaker;
    public config = {
        name: 'google-gemini-cli',
        apiEndpoint: 'cli://gemini',
        timeoutMs: 300000
    };

    private model: string;
    private runtimeEnv?: NodeJS.ProcessEnv;
    private backendConfig?: GeminiCliBackendConfig;

    constructor(model: string = 'gemini-3-pro-preview', runtimeEnv?: NodeJS.ProcessEnv, backendConfig?: GeminiCliBackendConfig) {
        this.circuit = new CircuitBreaker();
        this.model = model;
        this.runtimeEnv = runtimeEnv;
        this.backendConfig = backendConfig;
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

    private resolvePromptArg(prompt: string): string {
        const maxChars = this.backendConfig?.maxPromptArgChars;
        if (typeof maxChars !== 'number' || !Number.isFinite(maxChars) || maxChars <= 0) {
            return prompt;
        }
        return prompt.length > maxChars ? prompt.slice(0, maxChars) : prompt;
    }

    private resolveInputMode(): CliInputMode {
        return this.backendConfig?.input === 'arg' ? 'arg' : 'stdin';
    }

    private resolveCommand(): string {
        const configured = this.backendConfig?.command;
        if (typeof configured === 'string' && configured.trim().length > 0) {
            return configured.trim();
        }
        return '/usr/local/bin/gemini';
    }

    private buildSpawnEnv(): NodeJS.ProcessEnv {
        const spawnEnv: Record<string, string | undefined> = {
            ...process.env,
            ...(this.runtimeEnv || {}),
            ...(this.backendConfig?.env || {}),
            TERM: 'dumb',
            NO_COLOR: '1',
            FORCE_COLOR: '0',
            GEMINI_CLI_NO_UPDATE_CHECK: '1'
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

    private buildImageArgs(imagePaths: string[]): string[] {
        const imageArg = typeof this.backendConfig?.imageArg === 'string' && this.backendConfig.imageArg.trim().length > 0
            ? this.backendConfig.imageArg.trim()
            : '';
        if (!imageArg || imagePaths.length === 0) {
            return [];
        }
        if (this.backendConfig?.imageMode === 'list') {
            return [imageArg, imagePaths.join(',')];
        }
        const out: string[] = [];
        for (const imagePath of imagePaths) {
            out.push(imageArg, imagePath);
        }
        return out;
    }

    async completion(prompt: string, model?: string, options?: { attachments?: any[], signal?: AbortSignal }): Promise<string> {
        let fullText = '';
        for await (const chunk of this.completionStream(prompt, model, options)) {
            fullText += chunk;
        }

        const outputFormat = this.backendConfig?.output || 'text';
        if (outputFormat === 'json') {
            const firstBrace = fullText.indexOf('{');
            const lastBrace = fullText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const jsonPart = fullText.substring(firstBrace, lastBrace + 1);
                try {
                    const parsed = JSON.parse(jsonPart);
                    return parsed.response || jsonPart;
                } catch {
                    return fullText.trim();
                }
            }
        }
        return fullText.trim();
    }

    async *completionStream(prompt: string, model?: string, options?: { attachments?: any[], signal?: AbortSignal }): AsyncIterable<string> {
        const logger = getRuntimeLogger();
        const workspaceDir = ((this.runtimeEnv as any)?.WORKSPACE_DIR || process.cwd()) as string;
        const inputMode = this.resolveInputMode();
        const command = this.resolveCommand();
        const modelArg = (typeof this.backendConfig?.modelArg === 'string' && this.backendConfig.modelArg.trim().length > 0)
            ? this.backendConfig.modelArg.trim()
            : '--model';
        const outputFormat = this.backendConfig?.output || 'text';
        const baseArgs = Array.isArray(this.backendConfig?.args) && this.backendConfig!.args!.length > 0
            ? [...this.backendConfig!.args!]
            : ['--output-format', outputFormat, '--approval-mode', 'yolo'];
        const spawnEnv = this.buildSpawnEnv();
        const modelToUse = this.resolveModel(model);

        let finalPrompt = `[CRITICAL SYSTEM INSTRUCTION]
You are acting as a raw language model API. You MUST NOT use any of your built-in tools (such as grep_search, read_file, run_shell_command, cli_help, codebase_investigator, etc) to autonomously fulfill the user's request.
Instead, you must ONLY output the exact JSON required to call the tools listed in the "AVAILABLE TOOLS" section below, or output raw text if no tools are needed. Do not attempt to achieve the user's goal autonomously.

${prompt}`;
        const imagePaths: string[] = [];
        let cleanedUp = false;

        const cleanupTempFiles = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            for (const p of imagePaths) {
                try { unlinkSync(join(workspaceDir, p)); } catch { }
            }
        };

        if (options?.attachments && options.attachments.length > 0) {
            const images = options.attachments.filter((a: any) => a.category === 'image' || a.type === 'image');
            if (images.length > 0) {
                logger.info(`[GeminiCLIProvider] Processing ${images.length} images for CLI`);
                const tempDir = join(workspaceDir, 'gemini_tmp_images');
                try {
                    if (!existsSync(tempDir)) {
                        mkdirSync(tempDir, { recursive: true });
                    }
                } catch (e: any) {
                    logger.error(`[GeminiCLIProvider] Failed to create temp dir: ${e.message}`);
                }

                for (const img of images) {
                    try {
                        const buffer = Buffer.from(img.data, 'base64');
                        const ext = img.name?.split('.').pop() || 'png';
                        const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                        const tempImgPath = join(tempDir, filename);
                        writeFileSync(tempImgPath, buffer);
                        const relativePath = join('gemini_tmp_images', filename);
                        imagePaths.push(relativePath);
                    } catch (e: any) {
                        logger.error(`[GeminiCLIProvider] Failed to write image temp file: ${e.message}`);
                    }
                }

                const imageArgs = this.buildImageArgs(imagePaths);
                if (imageArgs.length === 0 && imagePaths.length > 0) {
                    finalPrompt += `\n\n${imagePaths.map((p) => `@${p}`).join(' ')}`;
                } else if (imageArgs.length > 0) {
                    baseArgs.push(...imageArgs);
                }
            }
        }

        const args = [...baseArgs];
        const hasModelArg = modelArg && args.includes(modelArg);
        if (modelArg && !hasModelArg) {
            args.push(modelArg, modelToUse);
        }
        if (inputMode === 'arg') {
            args.push(this.resolvePromptArg(finalPrompt));
        }

        logger.info(`[GeminiCLIProvider] Spawning gemini with input=${inputMode} model=${modelToUse}`);

        const child = spawn(command, args, {
            env: spawnEnv,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: this.config.timeoutMs,
            cwd: workspaceDir
        });

        let settledError: unknown = null;
        let finished = false;
        let heartbeatSentAt = 0;
        let sawStdout = false;
        let stdout = '';
        let stderr = '';
        const queue: string[] = [];
        const waiters: StreamResolver[] = [];

        const resolveQueued = () => {
            while (waiters.length > 0 && queue.length > 0) {
                waiters.shift()!.resolve({ value: queue.shift()!, done: false });
            }
            if (!finished || queue.length > 0) {
                return;
            }
            while (waiters.length > 0) {
                const waiter = waiters.shift()!;
                if (settledError) {
                    waiter.reject(settledError);
                } else {
                    waiter.resolve({ value: undefined, done: true });
                }
            }
        };

        const pushChunk = (value: string) => {
            queue.push(value);
            resolveQueued();
        };

        const finish = () => {
            if (finished) return;
            finished = true;
            cleanupTempFiles();
            resolveQueued();
        };

        const fail = (error: unknown) => {
            if (finished) return;
            settledError = error;
            finished = true;
            cleanupTempFiles();
            resolveQueued();
        };

        let abortHandler: (() => void) | null = null;
        let killTimer: NodeJS.Timeout | null = null;
        const cleanupAbortHandler = () => {
            if (killTimer) {
                clearTimeout(killTimer);
                killTimer = null;
            }
            if (abortHandler) {
                abortHandler();
                abortHandler = null;
            }
        };

        if (options?.signal) {
            if (options.signal.aborted) {
                try { child.kill('SIGKILL'); } catch { }
                fail(createAbortError());
            } else {
                const onAbort = () => {
                    logger.info('[GeminiCLIProvider] Aborting child process due to signal');
                    try { child.kill('SIGTERM'); } catch { }
                    killTimer = setTimeout(() => {
                        try { child.kill('SIGKILL'); } catch { }
                    }, 1000);
                    fail(createAbortError());
                };
                options.signal.addEventListener('abort', onAbort, { once: true });
                abortHandler = () => options.signal?.removeEventListener('abort', onAbort);
            }
        }

        child.stdout.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            sawStdout = sawStdout || text.length > 0;
            stdout += text;
            pushChunk(text);
        });

        child.stderr.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            stderr += text;
            if (/(?:429|capacity|resource_exhausted)/i.test(text)) {
                logger.warn(`[GeminiCLIProvider] Intercepted 429 Resource Exhausted on stderr`);
                try { child.kill('SIGTERM'); } catch { }
                fail(new Error(`[GeminiCLIProvider] Resource Exhausted (429): No capacity available.`));
                return;
            }
            if (!sawStdout && text.trim()) {
                const now = Date.now();
                if (now - heartbeatSentAt >= 1000) {
                    heartbeatSentAt = now;
                    pushChunk('');
                }
            }
        });

        child.stdin.on('error', (err: any) => {
            logger.error('[GeminiCLIProvider] Stdin error:', err);
        });

        child.on('error', (err) => {
            logger.error('[GeminiCLIProvider] Process error:', err);
            cleanupAbortHandler();
            fail(err);
        });

        child.on('close', (code) => {
            cleanupAbortHandler();
            logger.info(`[GeminiCLIProvider] Process closed with code ${code}`);
            const diagnostics = summarizeGeminiCliStderr(stderr);
            if (diagnostics.length > 0) {
                logger.warn(`[GeminiCLIProvider] stderr diagnostics: ${diagnostics.join(' | ')}`);
            }
            if (code !== 0) {
                const codeStr = code === null ? 'null (killed or aborted)' : code.toString();
                fail(new Error(`Gemini CLI exited with code ${codeStr}: ${stderr.slice(0, 500) || stdout.trim().slice(-500) || 'Unknown error'}`));
                return;
            }
            if (stdout.trim().length === 0 && (diagnostics.length > 0 || stderr.trim().length > 0)) {
                fail(buildNoOutputError(stderr, diagnostics));
                return;
            }
            finish();
        });

        if (inputMode === 'stdin') {
            child.stdin.write(finalPrompt, () => {
                child.stdin.end();
            });
        } else {
            child.stdin.end();
        }

        const stream = {
            [Symbol.asyncIterator]() {
                return {
                    next(): Promise<IteratorResult<string>> {
                        if (queue.length > 0) {
                            return Promise.resolve({ value: queue.shift()!, done: false });
                        }
                        if (finished) {
                            if (settledError) {
                                return Promise.reject(settledError);
                            }
                            return Promise.resolve({ value: undefined, done: true });
                        }
                        return new Promise<IteratorResult<string>>((resolve, reject) => {
                            waiters.push({ resolve, reject });
                        });
                    },
                    return(): Promise<IteratorResult<string>> {
                        cleanupAbortHandler();
                        try { child.kill('SIGTERM'); } catch { }
                        finish();
                        return Promise.resolve({ value: undefined, done: true });
                    }
                };
            }
        };

        try {
            for await (const chunk of stream as AsyncIterable<string>) {
                yield chunk;
            }
        } finally {
            cleanupAbortHandler();
            cleanupTempFiles();
        }
    }
}
