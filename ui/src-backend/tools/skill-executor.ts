// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getRuntimeLogger } from '../core/logger.ts';
import { resolveDefaultMediaStorageDir } from '../infra/runtime-paths';

/**
 * Result from executing a skill
 */
export interface SkillExecutionResult {
    outputPath?: string;
    output?: string;
    success: boolean;
    error?: string;
}

/**
 * Options for skill execution
 */
export interface SkillExecutionOptions {
    prompt: string;
    output?: string;
    storageDir?: string;
    [key: string]: any;
}

// Global skills manager instance - set by the application during initialization
let globalSkillsManager: any = null;

/**
 * Set the global skills manager instance
 */
export function setGlobalSkillsManager(manager: any): void {
    globalSkillsManager = manager;
}

/**
 * Get the global skills manager instance
 */
export function getGlobalSkillsManager(): any {
    return globalSkillsManager;
}

/**
 * Execute a skill by ID
 * 
 * This is a wrapper that handles both:
 * 1. Using the SkillsManager if available
 * 2. Direct execution for image generation skills (nano-banana-pro)
 */
export async function executeSkill(
    skillId: string,
    options: SkillExecutionOptions
): Promise<SkillExecutionResult> {
    const logger = getRuntimeLogger();

    // Try SkillsManager first
    if (globalSkillsManager) {
        try {
            const result = await globalSkillsManager.run(skillId, options.prompt || '');
            
            // The manager returns a string output
            // For image generation skills, we need to parse the output path
            const pathMatch = result.match(/(?:saved to|output:|generated:|MEDIA:)\s*(.+\.(png|jpg|jpeg|webp))/i);
            if (pathMatch) {
                return {
                    outputPath: pathMatch[1].trim(),
                    output: result,
                    success: true,
                };
            }

            // If the output itself looks like a file path
            if (result.includes('/media/') || result.includes('\\media\\') || /\.(png|jpg|jpeg|webp)$/i.test(result)) {
                return {
                    outputPath: result.trim(),
                    output: result,
                    success: true,
                };
            }

            // Return as text output
            return {
                output: result,
                success: true,
            };
        } catch (error: any) {
            logger.error(`SkillsManager failed for ${skillId}:`, error);
            // Fall through to direct execution
        }
    }

    // Direct execution for known skills
    if (skillId === 'nano-banana-pro') {
        return await executeNanoBananaPro(options);
    }

    throw new Error(`Skill "${skillId}" not found and no SkillsManager available`);
}

/**
 * Direct execution for nano-banana-pro skill
 * 
 * This bypasses the SkillsManager and runs the Python script directly,
 * which is useful when the manager isn't initialized or for testing.
 */
async function executeNanoBananaPro(options: SkillExecutionOptions): Promise<SkillExecutionResult> {
    const logger = getRuntimeLogger();
    const { prompt, output, storageDir } = options;

    // Resolve the skill directory
    const baseDir = process.cwd();
    const possibleDirs = [
        path.join(baseDir, 'skills', 'nano-banana-pro'),
        path.join(baseDir, 'src', 'skills', 'nano-banana-pro'),
    ];

    let skillDir: string | null = null;
    for (const dir of possibleDirs) {
        if (fs.existsSync(dir)) {
            skillDir = dir;
            break;
        }
    }

    if (!skillDir) {
        throw new Error('nano-banana-pro skill directory not found');
    }

    // Resolve output path
    const timestamp = Date.now();
    const outputPath = output || path.join(storageDir || resolveDefaultMediaStorageDir(), `image-${timestamp}.png`);
    const outputDir = path.dirname(outputPath);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // Find the Python script
    const scriptPath = path.join(skillDir, 'scripts', 'image.py');
    if (!fs.existsSync(scriptPath)) {
        // Try generate_image.py as fallback
        const altScriptPath = path.join(skillDir, 'scripts', 'generate_image.py');
        if (fs.existsSync(altScriptPath)) {
            return executeNanoBananaProScript(altScriptPath, prompt, outputPath, skillDir);
        }
        throw new Error(`nano-banana-pro script not found at ${scriptPath}`);
    }

    return executeNanoBananaProScript(scriptPath, prompt, outputPath, skillDir);
}

/**
 * Get API key for a skill from multiple sources
 */
function getSkillApiKey(skillId: string): string | null {
    // 1. Check if globalSkillsManager has the config
    if (globalSkillsManager) {
        try {
            const entry = globalSkillsManager.getSkillEntry?.(skillId);
            if (entry?.apiKey) {
                return entry.apiKey;
            }
        } catch {
            // Ignore errors, fall through
        }
    }

    // 2. Check process.env (loaded from .env)
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey) {
        return envKey;
    }

    // 3. Try to load from .env file directly
    try {
        const dotenv = require('dotenv');
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
        const envPaths = [
            path.join(homeDir, 'powerdirector', '.env'),
            path.join(process.cwd(), '.env'),
        ];

        for (const envPath of envPaths) {
            if (fs.existsSync(envPath)) {
                const result = dotenv.config({ path: envPath });
                if (result.parsed?.GEMINI_API_KEY) {
                    return result.parsed.GEMINI_API_KEY;
                }
            }
        }
    } catch {
        // dotenv not available or error loading
    }

    // 4. Try to read from powerdirector.config.json
    try {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
        const configPaths = [
            path.join(homeDir, 'powerdirector', 'powerdirector.config.json'),
            path.join(process.cwd(), 'powerdirector.config.json'),
        ];

        for (const configPath of configPaths) {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const apiKey = config?.skills?.entries?.['nano-banana-pro']?.apiKey;
                if (apiKey) {
                    return apiKey;
                }
            }
        }
    } catch {
        // Error reading config
    }

    return null;
}

/**
 * Execute the nano-banana-pro Python script
 */
async function executeNanoBananaProScript(
    scriptPath: string,
    prompt: string,
    outputPath: string,
    skillDir: string
): Promise<SkillExecutionResult> {
    const logger = getRuntimeLogger();

    return new Promise((resolve, reject) => {
        const args = [
            scriptPath,
            '--prompt', prompt,
            '--output', outputPath,
        ];

        // Get API key from multiple sources
        const apiKey = getSkillApiKey('nano-banana-pro');
        if (!apiKey) {
            reject(new Error('GEMINI_API_KEY not configured. Set it in .env, powerdirector.config.json, or skills.entries."nano-banana-pro".apiKey'));
            return;
        }

        // Set environment for the skill
        const env = {
            ...process.env,
            GEMINI_API_KEY: apiKey,
            SKILL_DIR: skillDir,
        };

        logger.info(`[SkillExecutor] Running: uv run ${args.join(' ')}`);

        const child = spawn('uv', ['run', ...args], {
            cwd: skillDir,
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk: Buffer) => {
            stdout += chunk.toString('utf-8');
        });

        child.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString('utf-8');
        });

        const timeout = setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('nano-banana-pro timed out after 60s'));
        }, 60000);

        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });

        child.on('close', (code) => {
            clearTimeout(timeout);

            if (code !== 0) {
                const message = stderr.trim() || stdout.trim() || `exit code ${code}`;
                reject(new Error(`nano-banana-pro failed: ${message}`));
                return;
            }

            // Check if the output file was created
            if (fs.existsSync(outputPath)) {
                resolve({
                    outputPath,
                    output: stdout.trim() || `Image generated: ${outputPath}`,
                    success: true,
                });
            } else {
                // Parse output for the path
                const pathMatch = stdout.match(/(?:saved to|output:|generated:)\s*(.+\.(png|jpg|jpeg|webp))/i);
                if (pathMatch) {
                    resolve({
                        outputPath: pathMatch[1].trim(),
                        output: stdout,
                        success: true,
                    });
                } else {
                    resolve({
                        output: stdout,
                        success: true,
                    });
                }
            }
        });
    });
}
