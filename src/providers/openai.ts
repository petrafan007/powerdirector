// @ts-nocheck
import OpenAI from 'openai';
import { Provider } from '../reliability/router.ts';
import { CircuitBreaker } from '../reliability/circuit-breaker.ts';

interface OpenAIProviderOptions {
    timeoutMs?: number;
    maxTokens?: number;
    baseURL?: string;
    rateLimitPerMinute?: number;
}

export class OpenAIProvider implements Provider {
    private client: OpenAI;
    public circuit: CircuitBreaker;
    private model: string;
    private maxTokens: number;
    public config = {
        name: 'openai',
        apiEndpoint: 'https://api.openai.com/v1',
        timeoutMs: 30000,
        rateLimitPerMinute: undefined as number | undefined
    };

    constructor(apiKey: string, model: string = 'gpt-5.3-codex', options: OpenAIProviderOptions = {}) {
        const timeoutMs = options.timeoutMs ?? 30000;
        this.client = new OpenAI({
            apiKey,
            baseURL: options.baseURL,
            timeout: timeoutMs
        });
        this.circuit = new CircuitBreaker();
        this.model = model;
        this.maxTokens = options.maxTokens ?? 16384;
        this.config.timeoutMs = timeoutMs;
        this.config.rateLimitPerMinute = options.rateLimitPerMinute;
        if (options.baseURL) {
            this.config.apiEndpoint = options.baseURL;
        }
    }

    async completion(prompt: string, model?: string, options?: { signal?: AbortSignal }): Promise<string> {
        // Simple adaptation: prompt string -> user message
        const response = await this.client.chat.completions.create({
            model: model || this.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: this.maxTokens
        }, { signal: options?.signal });

        return response.choices[0]?.message?.content || '';
    }

    async *completionStream(prompt: string, model?: string, options?: { signal?: AbortSignal }): AsyncIterable<string> {
        const stream = await this.client.chat.completions.create({
            model: model || this.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: this.maxTokens,
            stream: true
        }, { signal: options?.signal });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) yield content;
        }
    }
}
