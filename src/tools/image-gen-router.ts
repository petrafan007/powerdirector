// @ts-nocheck
import { ToolResult } from './base.ts';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import axios from 'axios';
import FormData from 'form-data';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeSkill } from './skill-executor.ts';

/**
 * Image Generation Model Configuration
 */
export interface ImageGenModelConfig {
    primary?: string;
    fallbacks?: string[];
}

/**
 * Parsed model reference - either a skill or provider/model
 */
interface ModelRef {
    type: 'skill' | 'provider';
    skillId?: string;
    provider?: string;
    model?: string;
}

/**
 * Result from image generation attempt
 */
export interface ImageGenResult {
    outputPath: string;
    provider: string;
    model: string;
}

/**
 * Record of a failed attempt
 */
export interface ImageGenAttempt {
    provider: string;
    model: string;
    error: string;
}

/**
 * API keys for different providers
 */
export interface ImageGenApiKeys {
    openai?: string;
    stability?: string;
    google?: string;
}

/**
 * Configuration for the router
 */
export interface ImageGenRouterConfig {
    storageDir: string;
    preserveFilenames: boolean;
    apiKeys: ImageGenApiKeys;
    defaultSize?: string;
}

/**
 * Parse a model reference string
 * 
 * Formats:
 * - "skill:nano-banana-pro" → skill reference
 * - "google/imagen-3.0-generate-001" → provider/model reference
 * - "stability/sd3.5-large" → provider/model reference
 * - "openai/dall-e-3" → provider/model reference
 */
function parseModelRef(ref: string): ModelRef | null {
    const trimmed = ref.trim();
    if (!trimmed) return null;

    // Check for skill reference
    if (trimmed.startsWith('skill:')) {
        const skillId = trimmed.slice(6).trim();
        if (!skillId) return null;
        return { type: 'skill', skillId };
    }

    // Check for provider/model format
    const slashIdx = trimmed.indexOf('/');
    if (slashIdx <= 0 || slashIdx >= trimmed.length - 1) {
        return null;
    }

    const provider = trimmed.slice(0, slashIdx).trim();
    const model = trimmed.slice(slashIdx + 1).trim();

    if (!provider || !model) return null;

    return { type: 'provider', provider, model };
}

/**
 * Resolve candidates from config (primary + fallbacks)
 */
function resolveCandidates(config: ImageGenModelConfig): string[] {
    const candidates: string[] = [];
    
    if (config.primary?.trim()) {
        candidates.push(config.primary.trim());
    }
    
    for (const fb of config.fallbacks ?? []) {
        if (fb?.trim()) {
            candidates.push(fb.trim());
        }
    }
    
    // Dedupe while preserving order
    return Array.from(new Set(candidates));
}

/**
 * Execute image generation via skill
 */
async function executeSkillGeneration(
    skillId: string,
    prompt: string,
    outputPath: string,
    routerConfig: ImageGenRouterConfig
): Promise<ImageGenResult> {
    // Skills like nano-banana-pro handle their own API keys via config
    const result = await executeSkill(skillId, {
        prompt,
        output: outputPath,
        // Pass through any relevant config
        storageDir: routerConfig.storageDir,
    });

    // The skill executor returns the output path
    return {
        outputPath: result.outputPath || outputPath,
        provider: 'skill',
        model: skillId,
    };
}

/**
 * Execute image generation via Google Imagen API
 */
async function executeGoogleGeneration(
    model: string,
    prompt: string,
    outputPath: string,
    apiKey: string
): Promise<ImageGenResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model });

    const result = await generativeModel.generateContent(prompt);
    const response = result.response;

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart: any = parts.find(p => (p as any).inlineData?.mimeType?.startsWith('image/'));

    if (imagePart?.inlineData?.data) {
        await fs.promises.writeFile(outputPath, Buffer.from(imagePart.inlineData.data, 'base64'));
        return { outputPath, provider: 'google', model };
    }

    throw new Error('No image data returned from Google AI');
}

/**
 * Execute image generation via OpenAI DALL-E API
 */
async function executeOpenaiGeneration(
    model: string,
    prompt: string,
    outputPath: string,
    apiKey: string,
    size: string = '1024x1024'
): Promise<ImageGenResult> {
    const openai = new OpenAI({ apiKey });

    const response = await openai.images.generate({
        model,
        prompt,
        n: 1,
        size: size as any,
        style: 'vivid',
        response_format: 'b64_json',
    });

    if (!response.data || !response.data[0]) {
        throw new Error('No data returned from OpenAI');
    }

    const b64 = response.data[0].b64_json;
    if (!b64) {
        throw new Error('No image data returned from OpenAI');
    }

    await fs.promises.writeFile(outputPath, Buffer.from(b64, 'base64'));
    return { outputPath, provider: 'openai', model };
}

/**
 * Execute image generation via Stability AI API
 */
async function executeStabilityGeneration(
    model: string,
    prompt: string,
    outputPath: string,
    apiKey: string
): Promise<ImageGenResult> {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'png');

    const response = await axios.post(
        `https://api.stability.ai/v2beta/stable-image/generate/sd3`,
        formData,
        {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${apiKey}`,
                Accept: 'image/*',
            },
            responseType: 'arraybuffer',
            validateStatus: undefined,
        }
    );

    if (response.status !== 200) {
        throw new Error(`Stability API Error: ${response.status}: ${response.data.toString()}`);
    }

    await fs.promises.writeFile(outputPath, Buffer.from(response.data));
    return { outputPath, provider: 'stability', model };
}

/**
 * Execute generation for a single provider
 */
async function executeProviderGeneration(
    provider: string,
    model: string,
    prompt: string,
    outputPath: string,
    routerConfig: ImageGenRouterConfig
): Promise<ImageGenResult> {
    const { apiKeys, defaultSize } = routerConfig;

    switch (provider.toLowerCase()) {
        case 'google':
            if (!apiKeys.google) {
                throw new Error('Google API key not configured');
            }
            return await executeGoogleGeneration(model, prompt, outputPath, apiKeys.google);

        case 'openai':
            if (!apiKeys.openai) {
                throw new Error('OpenAI API key not configured');
            }
            return await executeOpenaiGeneration(
                model,
                prompt,
                outputPath,
                apiKeys.openai,
                defaultSize || '1024x1024'
            );

        case 'stability':
            if (!apiKeys.stability) {
                throw new Error('Stability API key not configured');
            }
            return await executeStabilityGeneration(model, prompt, outputPath, apiKeys.stability);

        default:
            throw new Error(`Unknown image generation provider: ${provider}`);
    }
}

/**
 * Resolve output filename
 */
function resolveOutputFilename(
    rawFilename: string | undefined,
    timestamp: number,
    preserveFilenames: boolean
): string {
    if (!preserveFilenames || !rawFilename?.trim()) {
        return `image-${timestamp}.png`;
    }

    const base = path.basename(rawFilename.trim());
    const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
    if (!sanitized || sanitized === '.' || sanitized === '..') {
        return `image-${timestamp}.png`;
    }

    const stem = sanitized.replace(/\.[^.]+$/, '');
    if (!stem) {
        return `image-${timestamp}.png`;
    }

    return `${stem}.png`;
}

/**
 * Main entry point: Generate image with fallback support.
 * Tries models in order (primary → fallbacks) until one succeeds.
 */
export async function generateImageWithFallback(params: {
    prompt: string;
    config: ImageGenModelConfig;
    routerConfig: ImageGenRouterConfig;
    filename?: string;
}): Promise<{
    result: ImageGenResult;
    attempts: ImageGenAttempt[];
}> {
    const { prompt, config, routerConfig, filename } = params;

    // Resolve all candidates
    const candidates = resolveCandidates(config);
    if (candidates.length === 0) {
        throw new Error('No image generation models configured. Set agents.defaults.imageGenModel.primary or fallbacks.');
    }

    // Prepare output path
    const timestamp = Date.now();
    const outputFilename = resolveOutputFilename(
        filename,
        timestamp,
        routerConfig.preserveFilenames
    );
    const outputPath = path.resolve(routerConfig.storageDir, outputFilename);

    // Ensure storage directory exists
    if (!fs.existsSync(routerConfig.storageDir)) {
        await fs.promises.mkdir(routerConfig.storageDir, { recursive: true });
    }

    const attempts: ImageGenAttempt[] = [];

    // Try each candidate in order
    for (const candidate of candidates) {
        const ref = parseModelRef(candidate);
        if (!ref) {
            attempts.push({
                provider: 'unknown',
                model: candidate,
                error: 'Invalid model reference format',
            });
            continue;
        }

        try {
            let result: ImageGenResult;

            if (ref.type === 'skill') {
                result = await executeSkillGeneration(
                    ref.skillId!,
                    prompt,
                    outputPath,
                    routerConfig
                );
            } else {
                // Direct API generation
                result = await executeProviderGeneration(
                    ref.provider!,
                    ref.model!,
                    prompt,
                    outputPath,
                    routerConfig
                );
            }

            // Success! Return result
            return { result, attempts };

        } catch (error: any) {
            attempts.push({
                provider: ref.type === 'skill' ? 'skill' : ref.provider!,
                model: ref.type === 'skill' ? ref.skillId! : ref.model!,
                error: error.message,
            });
        }
    }

    // All attempts failed
    throw new Error(
        `All image generation attempts failed.\n` +
        attempts.map(a => `  - ${a.provider}/${a.model}: ${a.error}`).join('\n')
    );
}

/**
 * Coerce imageGenModel config from raw config object
 */
export function coerceImageGenModelConfig(cfg: any): ImageGenModelConfig {
    const raw = cfg?.agents?.defaults?.imageGenModel;
    if (!raw) return {};

    if (typeof raw === 'string') {
        return { primary: raw.trim() };
    }

    if (typeof raw === 'object') {
        return {
            primary: typeof raw.primary === 'string' ? raw.primary.trim() : undefined,
            fallbacks: Array.isArray(raw.fallbacks)
                ? raw.fallbacks.filter((f: any) => typeof f === 'string').map((f: string) => f.trim())
                : undefined,
        };
    }

    return {};
}

/**
 * Check if image generation is configured
 */
export function isImageGenConfigured(config: ImageGenModelConfig): boolean {
    return Boolean(config.primary?.trim() || (config.fallbacks?.length ?? 0) > 0);
}