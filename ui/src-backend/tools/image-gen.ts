// @ts-nocheck
import { Tool, ToolResult } from './base';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    generateImageWithFallback,
    coerceImageGenModelConfig,
    isImageGenConfigured,
    type ImageGenModelConfig,
    type ImageGenRouterConfig,
} from './image-gen-router';

interface ImageGenToolOptions {
    enabled?: boolean;
    defaultProvider?: 'openai' | 'stability' | 'google';
    defaultModel?: string;
    defaultSize?: string;
    preserveFilenames?: boolean;
    storageDir?: string;
    maxUploadSizeBytes?: number;
    allowedMimeTypes?: string[];
    imageGenModel?: ImageGenModelConfig;
    // API keys for fallback providers
    openaiApiKey?: string;
    stabilityApiKey?: string;
    googleApiKey?: string;
}

export class ImageGenTool implements Tool {
    public name = 'image_gen';
    public description = 'Generate images using AI and validate media uploads. Actions: generate, validate_upload.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['generate', 'validate_upload'] },
            prompt: { type: 'string', description: 'Image description' },
            provider: { type: 'string', enum: ['openai', 'stability', 'google'], default: 'google' },
            size: { type: 'string', description: 'Size (e.g. 1024x1024)' },
            style: { type: 'string', enum: ['vivid', 'natural'], description: 'DALL-E style' },
            model: { type: 'string', description: 'Specific model (e.g. sd3.5-large, dall-e-3, imagen-3.0-generate-001)' },
            filename: { type: 'string', description: 'Preferred output filename (used when preserveFilenames is enabled)' },
            filePath: { type: 'string', description: 'File path to validate for upload limits' },
            mimeType: { type: 'string', description: 'Mime type to validate against allowlist' },
            sizeBytes: { type: 'number', description: 'Explicit upload size in bytes' }
        },
        required: ['action']
    };

    private openai: OpenAI | null = null;
    private stabilityApiKey: string | null = null;
    private googleGenAi: GoogleGenerativeAI | null = null;
    private readonly enabled: boolean;
    private readonly defaultProvider: 'openai' | 'stability' | 'google';
    private readonly defaultModel: string;
    private readonly defaultSize: string;
    private readonly preserveFilenames: boolean;
    private readonly storageDir: string;
    private readonly maxUploadSizeBytes: number;
    private readonly allowedMimeTypes: string[];
    private readonly imageGenModel: ImageGenModelConfig;
    private readonly openaiApiKey: string | null = null;
    private readonly googleApiKey: string | null = null;

    constructor(openaiKey?: string, stabilityKey?: string, googleKey?: string, options: ImageGenToolOptions = {}) {
        if (openaiKey) this.openai = new OpenAI({ apiKey: openaiKey });
        this.stabilityApiKey = stabilityKey || null;
        if (googleKey) this.googleGenAi = new GoogleGenerativeAI(googleKey);
        
        this.enabled = options.enabled !== false;
        this.defaultProvider = options.defaultProvider || 'google';
        this.defaultModel = options.defaultModel || '';
        this.defaultSize = options.defaultSize || '1024x1024';
        this.preserveFilenames = options.preserveFilenames === true;
        this.storageDir = options.storageDir || process.cwd();
        this.maxUploadSizeBytes = Math.max(1, Math.floor(options.maxUploadSizeBytes ?? 50 * 1024 * 1024));
        this.allowedMimeTypes = Array.isArray(options.allowedMimeTypes)
            ? options.allowedMimeTypes.filter((type) => typeof type === 'string' && type.trim().length > 0)
            : [];

        this.imageGenModel = options.imageGenModel || {};
        this.openaiApiKey = openaiKey || options.openaiApiKey || null;
        this.googleApiKey = googleKey || options.googleApiKey || null;

        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }

    async execute(args: any): Promise<ToolResult> {
        if (args.action === 'validate_upload') {
            return this.validateUpload(args);
        }

        if (args.action !== 'generate') {
            return { output: `Unknown action: ${args.action}`, isError: true };
        }
        if (!this.enabled) {
            return { output: 'Image generation is disabled by media settings.', isError: true };
        }

        const prompt = args.prompt;
        if (!prompt) {
            return { output: 'Prompt required for generate action.', isError: true };
        }

        if (isImageGenConfigured(this.imageGenModel)) {
            return await this.executeWithFallback(prompt, args.filename);
        }

        // Legacy behavior: single provider
        const provider = args.provider || this.defaultProvider;
        const timestamp = Date.now();
        const outputPath = path.resolve(this.storageDir, this.resolveOutputFilename(args.filename, timestamp));

        try {
            if (provider === 'openai') {
                if (!this.openai) return { output: 'OpenAI API key not configured', isError: true };
                const model = args.model || this.defaultModel || 'dall-e-3';
                const size = args.size || this.defaultSize || '1024x1024';

                const response = await this.openai.images.generate({
                    model,
                    prompt: prompt,
                    n: 1,
                    size: size as any,
                    style: args.style || "vivid",
                    response_format: "b64_json"
                });

                if (!response.data || !response.data[0]) throw new Error("No data returned from OpenAI");
                const b64 = response.data[0].b64_json;
                if (!b64) throw new Error("No image data returned from OpenAI");

                await fs.promises.writeFile(outputPath, Buffer.from(b64, 'base64'));
                return { output: `Image generated (DALL-E 3): ${outputPath}` };

            } else if (provider === 'stability') {
                if (!this.stabilityApiKey) return { output: 'Stability API key not configured', isError: true };

                const model = args.model || "sd3.5-large";

                const formData = new FormData();
                formData.append('prompt', prompt);
                formData.append('output_format', 'png');

                const response = await axios.post(
                    `https://api.stability.ai/v2beta/stable-image/generate/sd3`,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                            Authorization: `Bearer ${this.stabilityApiKey}`,
                            Accept: "image/*"
                        },
                        responseType: 'arraybuffer',
                        validateStatus: undefined
                    }
                );

                if (response.status !== 200) {
                    throw new Error(`Stability API Error: ${response.status}: ${response.data.toString()}`);
                }

                await fs.promises.writeFile(outputPath, Buffer.from(response.data));
                return { output: `Image generated (${model}): ${outputPath}` };
            } else if (provider === 'google') {
                if (!this.googleGenAi) return { output: 'Google AI API key not configured', isError: true };
                
                const rawModel = args.model || this.defaultModel || 'imagen-3.0-generate-001';
                // Strip any provider prefix
                const modelName = rawModel.includes('/') ? rawModel.split('/').pop()! : rawModel;
                const model = this.googleGenAi.getGenerativeModel({ model: modelName });
                
                // Imagen API call via generateContent
                const result = await model.generateContent(prompt);
                const response = result.response;
                
                const candidate = response.candidates?.[0];
                const parts = candidate?.content?.parts || [];
                const imagePart: any = parts.find(p => (p as any).inlineData?.mimeType?.startsWith('image/'));
                
                if (imagePart?.inlineData?.data) {
                    await fs.promises.writeFile(outputPath, Buffer.from(imagePart.inlineData.data, 'base64'));
                    return { output: `Image generated (Google ${modelName}): ${outputPath}` };
                }
                
                if ((response as any).text()) {
                    return { output: `Google AI returned text instead of image data: ${(response as any).text()}`, isError: true };
                }

                throw new Error("No image data returned from Google AI");
            } else {
                return { output: `Unknown provider: ${provider}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Image Gen Error: ${error.message}`, isError: true };
        }
    }

    private validateUpload(args: any): ToolResult {
        let sizeBytes = typeof args.sizeBytes === 'number' && Number.isFinite(args.sizeBytes)
            ? Math.max(0, Math.floor(args.sizeBytes))
            : 0;
        const filePath = typeof args.filePath === 'string' ? args.filePath.trim() : '';
        if (filePath) {
            try {
                const stats = fs.statSync(filePath);
                sizeBytes = stats.size;
            } catch (error: any) {
                return { output: `Upload validation failed: ${error.message}`, isError: true };
            }
        }

        const mimeType = typeof args.mimeType === 'string' ? args.mimeType.trim() : '';
        if (sizeBytes > this.maxUploadSizeBytes) {
            return {
                output: `Upload exceeds max size of ${this.maxUploadSizeBytes} bytes.`,
                isError: true
            };
        }
        if (this.allowedMimeTypes.length > 0 && (!mimeType || !this.allowedMimeTypes.includes(mimeType))) {
            return {
                output: `Upload mime type "${mimeType || 'unknown'}" is not allowed.`,
                isError: true
            };
        }

        return { output: 'Upload validation passed.' };
    }

    /**
     * Execute image generation using the configured fallback chain.
     * Tries models in order: primary → fallbacks
     */
    private async executeWithFallback(prompt: string, filename?: string): Promise<ToolResult> {
        try {
            const routerConfig: ImageGenRouterConfig = {
                storageDir: this.storageDir,
                preserveFilenames: this.preserveFilenames,
                apiKeys: {
                    openai: this.openaiApiKey || undefined,
                    stability: this.stabilityApiKey || undefined,
                    google: this.googleApiKey || undefined,
                },
                defaultSize: this.defaultSize,
            };

            const { result, attempts } = await generateImageWithFallback({
                prompt,
                config: this.imageGenModel,
                routerConfig,
                filename,
            });

            // Build a detailed response showing what was tried
            const attemptSummary = attempts.length > 0
                ? `\n\nFallback attempts:\n${attempts.map(a => `- ${a.provider}/${a.model}: ${a.error}`).join('\n')}`
                : '';

            return {
                output: `Image generated successfully via ${result.provider}/${result.model}: ${result.outputPath}${attemptSummary}`,
            };
        } catch (error: any) {
            return {
                output: `Image generation failed: ${error.message}`,
                isError: true,
            };
        }
    }

    private resolveOutputFilename(rawFilename: unknown, timestamp: number): string {
        if (!this.preserveFilenames || typeof rawFilename !== 'string' || rawFilename.trim().length === 0) {
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
}
