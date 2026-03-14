// @ts-nocheck
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Provider } from '../reliability/router.ts';
import { CircuitBreaker } from '../reliability/circuit-breaker.ts';

interface GeminiProviderOptions {
    timeoutMs?: number;
    maxTokens?: number;
    rateLimitPerMinute?: number;
}

export class GeminiProvider implements Provider {
    private client: GoogleGenerativeAI;
    public circuit: CircuitBreaker;
    public config = {
        name: 'gemini',
        apiEndpoint: 'https://generativelanguage.googleapis.com',
        timeoutMs: 30000,
        rateLimitPerMinute: undefined as number | undefined
    };

    private modelName: string;
    private maxTokens: number;

    constructor(apiKey: string, modelName: string = 'gemini-3-pro-preview', options: GeminiProviderOptions = {}) {
        this.client = new GoogleGenerativeAI(apiKey);
        this.circuit = new CircuitBreaker();
        this.modelName = modelName || 'gemini-3-pro-preview';
        this.maxTokens = options.maxTokens ?? 8192;
        this.config.timeoutMs = options.timeoutMs ?? 30000;
        this.config.rateLimitPerMinute = options.rateLimitPerMinute;
    }

    async completion(prompt: string, model?: string, options?: { signal?: AbortSignal }): Promise<string> {
        let genModel = this.client.getGenerativeModel({
            model: model || this.modelName,
            generationConfig: { maxOutputTokens: this.maxTokens } // Keep generationConfig here
        });

        const result = await genModel.generateContent(prompt, { signal: options?.signal });
        const text = result.response.text();
        if (!text) {
            throw new Error('Gemini returned an empty response');
        }
        return text;
    }

    async *completionStream(prompt: string, model?: string, options?: { signal?: AbortSignal }): AsyncIterable<string> {
        let genModel = this.client.getGenerativeModel({
            model: model || this.modelName,
            generationConfig: { maxOutputTokens: this.maxTokens }
        });

        const result = await genModel.generateContentStream(prompt, { signal: options?.signal });
        let sawChunk = false;
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                sawChunk = true;
                yield text;
            }
        }
        if (!sawChunk) {
            throw new Error('Gemini stream returned no text content');
        }
    }
}
