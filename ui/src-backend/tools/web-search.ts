// @ts-nocheck
import { Tool, ToolResult } from './base';
import axios from 'axios';

interface WebSearchToolConfig {
    provider?: 'brave' | 'google' | 'bing' | 'perplexity' | 'grok';
    apiKey?: string;
    maxResults?: number;
    timeoutSeconds?: number;
    cacheTtlMinutes?: number;
    perplexity?: {
        apiKey?: string;
        baseUrl?: string;
        model?: string;
    };
    grok?: {
        apiKey?: string;
        model?: string;
        inlineCitations?: boolean;
    };
}

export class WebSearchTool implements Tool {
    public name = 'web_search';
    public description = 'Search the web. Actions: search.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['search'] },
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Result limit (1-10)', minimum: 1, maximum: 10 },
            provider: { type: 'string', enum: ['brave', 'google', 'bing', 'perplexity', 'grok'] }
        },
        required: ['action', 'query']
    };

    private config: WebSearchToolConfig;

    constructor(config: WebSearchToolConfig) {
        this.config = config;
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            if (args.action !== 'search') {
                return { output: `Unknown action: ${args.action}`, isError: true };
            }

            const query = typeof args.query === 'string' ? args.query.trim() : '';
            if (!query) return { output: 'Query is required', isError: true };

            const provider = (args.provider || this.config.provider || 'brave') as WebSearchToolConfig['provider'];
            const limit = Math.max(1, Math.min(20, Number(args.limit || this.config.maxResults || 5)));
            const timeout = (this.config.timeoutSeconds || 20) * 1000;

            if (provider === 'brave') {
                return this.searchBrave(query, limit, timeout);
            }
            if (provider === 'perplexity') {
                return this.searchPerplexity(query, timeout);
            }
            if (provider === 'grok') {
                return this.searchGrok(query, timeout);
            }
            // Google/Bing require additional credentials not present in current schema.
            // We perform a standards-based fallback via DuckDuckGo instant answer API.
            return this.searchFallback(query, provider as any, timeout);
        } catch (error: any) {
            return { output: `Web Search Error: ${error.message}`, isError: true };
        }
    }

    private async searchBrave(query: string, limit: number, timeout: number): Promise<ToolResult> {
        const apiKey = this.config.apiKey;
        if (!apiKey) {
            return { output: 'Brave search selected but API key is missing.', isError: true };
        }

        const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
            params: { q: query, count: limit },
            headers: {
                Accept: 'application/json',
                'X-Subscription-Token': apiKey
            },
            timeout
        });

        const results = response.data?.web?.results || [];
        if (!Array.isArray(results) || results.length === 0) {
            return { output: 'No results found.' };
        }

        const lines = results.slice(0, limit).map((r: any, i: number) =>
            `${i + 1}. ${r.title || 'Untitled'}\n${r.url || ''}\n${r.description || ''}`.trim()
        );
        return { output: lines.join('\n\n') };
    }

    private async searchPerplexity(query: string, timeout: number): Promise<ToolResult> {
        const apiKey = this.config.perplexity?.apiKey || this.config.apiKey;
        const baseUrl = this.config.perplexity?.baseUrl || 'https://api.perplexity.ai';
        const model = this.config.perplexity?.model || 'sonar-pro-search';
        if (!apiKey) {
            return { output: 'Perplexity search selected but API key is missing.', isError: true };
        }

        const response = await axios.post(
            `${baseUrl.replace(/\/$/, '')}/chat/completions`,
            {
                model,
                messages: [
                    { role: 'system', content: 'You are a search assistant. Return concise web findings with links when available.' },
                    { role: 'user', content: query }
                ],
                temperature: 0.2
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout
            }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) return { output: 'No results found.' };
        return { output: String(content) };
    }

    private async searchGrok(query: string, timeout: number): Promise<ToolResult> {
        const apiKey = this.config.grok?.apiKey || this.config.apiKey;
        const model = this.config.grok?.model || 'grok-2-1212';
        if (!apiKey) {
            return { output: 'Grok search selected but API key is missing.', isError: true };
        }

        const response = await axios.post(
            'https://api.x.ai/v1/chat/completions',
            {
                model,
                messages: [
                    { role: 'system', content: 'You are a search assistant. Return concise web findings with links when available.' },
                    { role: 'user', content: query }
                ],
                temperature: 0.2,
                stream: false
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout
            }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) return { output: 'No results found.' };
        return { output: String(content) };
    }

    private async searchFallback(query: string, provider: 'google' | 'bing', timeout: number): Promise<ToolResult> {
        const response = await axios.get('https://api.duckduckgo.com/', {
            params: {
                q: query,
                format: 'json',
                no_redirect: 1,
                no_html: 1,
                skip_disambig: 1
            },
            timeout
        });

        const abstract = response.data?.AbstractText || '';
        const abstractUrl = response.data?.AbstractURL || '';
        const image = response.data?.Image || '';
        const related = Array.isArray(response.data?.RelatedTopics) ? response.data.RelatedTopics : [];

        const relatedLines = related
            .flatMap((r: any) => (r.Topics && Array.isArray(r.Topics) ? r.Topics : [r]))
            .slice(0, 5)
            .map((r: any, i: number) => `${i + 1}. ${r.Text || ''}\n${r.FirstURL || ''}`.trim())
            .filter(Boolean);

        const body = [
            `Provider "${provider}" currently uses a fallback backend in this build.`,
            image ? `Image found: ${image.startsWith('http') ? image : 'https://duckduckgo.com' + image}` : '',
            abstract ? `Summary: ${abstract}` : 'Summary: (none)',
            abstractUrl ? `Source: ${abstractUrl}` : '',
            relatedLines.length ? `Related:\n${relatedLines.join('\n\n')}` : ''
        ].filter(Boolean).join('\n\n');

        return { output: body || 'No results found.' };
    }
}

