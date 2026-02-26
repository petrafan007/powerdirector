// @ts-nocheck
import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Provider } from '../reliability/router.ts';
import { CircuitBreaker } from '../reliability/circuit-breaker.ts';
import { getRuntimeLogger } from '../core/logger.ts';

type CliInputMode = 'arg' | 'stdin';

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

function shellEscape(value: string): string {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
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

        let finalPrompt = prompt;
        const imagePaths: string[] = [];

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

        const hasModelArg = modelArg && baseArgs.includes(modelArg);
        if (modelArg && !hasModelArg) {
            baseArgs.push(modelArg, modelToUse);
        }

        const tempPromptFile = join(tmpdir(), `gemini-p-${Date.now()}.txt`);
        let commandText = '';
        if (inputMode === 'stdin') {
            writeFileSync(tempPromptFile, finalPrompt);
            const argsSegment = baseArgs.map((arg) => shellEscape(arg)).join(' ');
            commandText = `cat ${shellEscape(tempPromptFile)} | ${shellEscape(command)} ${argsSegment}`;
        } else {
            const promptArg = this.resolvePromptArg(finalPrompt);
            const argsSegment = [...baseArgs, promptArg].map((arg) => shellEscape(arg)).join(' ');
            commandText = `${shellEscape(command)} ${argsSegment}`;
        }

        logger.info(`[GeminiCLIProvider] Spawning gemini with input=${inputMode}`);

        const child = spawn('/bin/sh', ['-c', commandText], {
            env: spawnEnv,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: this.config.timeoutMs,
            cwd: workspaceDir
        });

        if (options?.signal) {
            const abortHandler = () => {
                logger.info(`[GeminiCLIProvider] Aborting child process due to signal`);
                child.kill('SIGKILL');
            };
            options.signal.addEventListener('abort', abortHandler, { once: true });
            child.on('close', () => options.signal?.removeEventListener('abort', abortHandler));
        }

        child.stdin.end();

        let stdout = '';
        let stderr = '';

        const stdoutIter = async function* () {
            for await (const chunk of child.stdout) {
                const text = chunk.toString();
                stdout += text;
                yield text;
            }
        };

        const stderrHandler = async () => {
            for await (const chunk of child.stderr) {
                stderr += chunk.toString();
            }
        };
        stderrHandler();

        for await (const chunk of stdoutIter()) {
            // If output is JSON, we can't easily stream the "response" field unless we parse it.
            // But we can just yield the raw chunks and let the consumer handle it.
            yield chunk;
        }

        const exitCode = await new Promise<number | null>((resolve) => {
            child.on('close', (code) => resolve(code));
        });

        if (inputMode === 'stdin') {
            try { unlinkSync(tempPromptFile); } catch { }
        }
        for (const p of imagePaths) {
            try { unlinkSync(join(workspaceDir, p)); } catch { }
        }

        logger.info(`[GeminiCLIProvider] Process closed with code ${exitCode}`);

        if (exitCode !== 0) {
            const codeStr = exitCode === null ? 'null (killed or aborted)' : exitCode.toString();
            throw new Error(`Gemini CLI exited with code ${codeStr}: ${stderr.slice(0, 500) || stdout.trim().slice(-500) || 'Unknown error'}`);
        }

        // Post-processing for JSON format if needed (though iterator already yielded raw chunks)
        // If the consumer expected final parsed response, they should use completion() 
        // which now calls completionStream and accumulates.
        if (outputFormat === 'json') {
            const firstBrace = stdout.indexOf('{');
            const lastBrace = stdout.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const jsonPart = stdout.substring(firstBrace, lastBrace + 1);
                try {
                    const parsed = JSON.parse(jsonPart);
                    // If we are in completion(), we want to return ONLY the response field if it exists.
                    // But we already yielded chunks. 
                    // This is a bit inconsistent. 
                    // Let's refine: completion() should return the parsed response.
                } catch { }
            }
        }
    }
}
