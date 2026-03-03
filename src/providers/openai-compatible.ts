// @ts-nocheck
import OpenAI from 'openai';
import { Provider, ProviderExecutionOptions } from '../reliability/router.ts';
import { CircuitBreaker } from '../reliability/circuit-breaker.ts';

export interface OpenAICompatibleConfig {
    name: string;
    apiKey: string;
    baseURL: string;
    defaultModel?: string;
    timeoutMs?: number;
    rateLimitPerMinute?: number;
    maxTokens?: number;
    disableTools?: boolean;
}

export class OpenAICompatibleProvider implements Provider {
    private client: OpenAI;
    public circuit: CircuitBreaker;
    public config: { name: string; apiEndpoint: string; timeoutMs: number; rateLimitPerMinute?: number };
    private defaultModel: string;
    private maxTokens: number;
    private disableTools: boolean;

    constructor(config: OpenAICompatibleConfig) {
        this.client = new OpenAI({
            apiKey: (config.apiKey === 'none' || config.apiKey === 'ollama') ? 'no-key' : config.apiKey,
            baseURL: config.baseURL
        });
        this.circuit = new CircuitBreaker();
        this.config = {
            name: config.name,
            apiEndpoint: config.baseURL,
            timeoutMs: config.timeoutMs || 30000,
            rateLimitPerMinute: config.rateLimitPerMinute
        };
        this.defaultModel = config.defaultModel || 'gpt-3.5-turbo'; // Fallback, usually overridden
        this.maxTokens = config.maxTokens ?? 4096;
        this.disableTools = !!config.disableTools;
    }

    async completion(prompt: string, model?: string, options?: ProviderExecutionOptions): Promise<string> {
        const targetModel = (model && model !== 'default') ? model : this.defaultModel;
        console.log(`[OpenAICompatible] Requesting ${targetModel} (prompt length: ${prompt.length})`);

        try {
            const body: any = {
                model: targetModel,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: this.maxTokens
            };

            if (options?.tools && options.tools.length > 0) {
                body.tools = options.tools;
                body.tool_choice = 'auto';
            }

            const response = await this.client.chat.completions.create(body, { signal: options?.signal });

            const choice = response.choices[0];
            let content = choice?.message?.content || '';
            const toolCalls = choice?.message?.tool_calls;

            console.log(`[OpenAICompatible] Response received. Content length: ${content.length}, finish_reason: ${choice?.finish_reason}, tool_calls: ${toolCalls?.length || 0}`);

            // If the model used native tool calls instead of text, convert them to our internal JSON format
            if (toolCalls && toolCalls.length > 0) {
                const toolBlocks = toolCalls.map(tc => {
                    const toolCall = tc as any;
                    if (!toolCall.function) return '';

                    try {
                        const args = typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments;
                        return `\`\`\`json\n${JSON.stringify({ tool: toolCall.function.name, args }, null, 2)}\n\`\`\``;
                    } catch (e) {
                        // If parsing fails, return the raw string as best-effort
                        return `\`\`\`json\n{"tool": "${toolCall.function.name}", "args": ${toolCall.function.arguments}}\n\`\`\``;
                    }
                }).filter(Boolean).join('\n\n');

                if (toolBlocks) {
                    content = (content ? content + '\n\n' : '') + toolBlocks;
                    console.log(`[OpenAICompatible] Converted native tool calls to JSON blocks.`);
                }
            }

            if (content.length === 0 && choice?.finish_reason) {
                console.warn(`[OpenAICompatible] Warning: Model returned empty content with finish_reason: ${choice.finish_reason}`);
            }

            return content;
        } catch (err: any) {
            console.error(`[OpenAICompatible] API Error: ${err.message}`, {
                status: err.status,
                type: err.type,
                code: err.code
            });
            throw err;
        }
    }

    async *completionStream(prompt: string, model?: string, options?: ProviderExecutionOptions): AsyncIterable<string> {
        const targetModel = model || this.defaultModel;
        console.log(`[OpenAICompatible] Streaming ${targetModel} (prompt length: ${prompt.length})`);

        try {
            const body: any = {
                model: targetModel,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: this.maxTokens,
                stream: true
            };

            if (options?.tools && options.tools.length > 0) {
                body.tools = options.tools;
                body.tool_choice = 'auto';
            }

            const stream = await this.client.chat.completions.create(body, { signal: options?.signal }) as any;

            let pendingToolCalls: any[] = [];

            for await (const chunk of stream) {
                const choice = chunk.choices[0];
                if (!choice) continue;

                // Yield normal text content
                const content = choice.delta?.content || '';
                if (content) {
                    yield content;
                }

                // Accumulate tool calls if they are sent natively via stream
                const toolCalls = choice.delta?.tool_calls;
                if (toolCalls && Array.isArray(toolCalls)) {
                    for (const tc of toolCalls) {
                        const index = tc.index;
                        if (!pendingToolCalls[index]) {
                            pendingToolCalls[index] = {
                                id: tc.id,
                                type: tc.type,
                                function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
                            };
                        } else {
                            if (tc.function?.name) pendingToolCalls[index].function.name += tc.function.name;
                            if (tc.function?.arguments) pendingToolCalls[index].function.arguments += tc.function.arguments;
                        }
                    }
                }
            }

            // After the stream ends, if we captured native tool calls, convert them and yield
            const validToolCalls = pendingToolCalls.filter(Boolean);
            if (validToolCalls.length > 0) {
                const toolBlocks = validToolCalls.map((tc: any) => {
                    if (!tc.function || !tc.function.name) return '';
                    try {
                        const args = typeof tc.function.arguments === 'string' && tc.function.arguments.trim()
                            ? JSON.parse(tc.function.arguments)
                            : {};
                        return `\`\`\`json\n${JSON.stringify({ tool: tc.function.name, args }, null, 2)}\n\`\`\``;
                    } catch (e) {
                        return `\`\`\`json\n{"tool": "${tc.function.name}", "args": ${tc.function.arguments}}\n\`\`\``;
                    }
                }).filter(Boolean).join('\n\n');

                if (toolBlocks) {
                    yield '\n\n' + toolBlocks;
                }
            }
        } catch (err: any) {
            console.error(`[OpenAICompatible] Stream Error: ${err.message}`, {
                status: err.status,
                type: err.type,
                code: err.code
            });
            throw err;
        }
    }
}
