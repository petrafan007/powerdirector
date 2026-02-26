// @ts-nocheck
import Anthropic from '@anthropic-ai/sdk';
import { Provider } from '../reliability/router.ts';
import { CircuitBreaker } from '../reliability/circuit-breaker.ts';

interface AnthropicProviderOptions {
    timeoutMs?: number;
    maxTokens?: number;
    baseURL?: string;
    rateLimitPerMinute?: number;
}

export class AnthropicProvider implements Provider {
    private client: Anthropic;
    public circuit: CircuitBreaker;
    private model: string;
    private maxTokens: number;
    public config = {
        name: 'anthropic',
        apiEndpoint: 'https://api.anthropic.com',
        timeoutMs: 30000,
        rateLimitPerMinute: undefined as number | undefined
    };

    constructor(apiKey: string, model: string = 'claude-4.5-opus', options: AnthropicProviderOptions = {}) {
        const timeoutMs = options.timeoutMs ?? 30000;
        this.client = new Anthropic({
            apiKey,
            baseURL: options.baseURL,
            timeout: timeoutMs
        });
        this.circuit = new CircuitBreaker();
        this.model = model;
        this.maxTokens = options.maxTokens ?? 8192;
        this.config.timeoutMs = timeoutMs;
        this.config.rateLimitPerMinute = options.rateLimitPerMinute;
        if (options.baseURL) {
            this.config.apiEndpoint = options.baseURL;
        }
    }

    async completion(prompt: string, model?: string, options?: { signal?: AbortSignal }): Promise<string> {
        // Simple adaptation: prompt string -> user message
        const response = await this.client.messages.create({
            model: (model && model !== 'default') ? model : this.model,
            max_tokens: this.maxTokens,
            messages: [{ role: 'user', content: prompt }]
        }, { signal: options?.signal });

        // Extract text
        const textBlock = response.content.find(block => block.type === 'text');
        if (textBlock && 'text' in textBlock) {
            return textBlock.text;
        }
        return '';
    }

    async *completionStream(prompt: string, model?: string, options?: { signal?: AbortSignal }): AsyncIterable<string> {
        const stream = await this.client.messages.create({
            model: model || this.model,
            max_tokens: this.maxTokens,
            messages: [{ role: 'user', content: prompt }],
            stream: true
        }, { signal: options?.signal });

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield event.delta.text;
            }
        }
    }
}
