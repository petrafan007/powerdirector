// @ts-nocheck
import { Tool, ToolResult } from './base.js';

interface WebFetchToolConfig {
    maxChars?: number;
    maxCharsCap?: number;
    timeoutSeconds?: number;
    maxRedirects?: number;
    userAgent?: string;
}

export class WebFetchTool implements Tool {
    public name = 'web_fetch';
    public description = 'Fetch a web page and return normalized text content.';
    public parameters = {
        type: 'object',
        properties: {
            url: { type: 'string', description: 'URL to fetch' },
            maxChars: { type: 'number', description: 'Maximum output characters' }
        },
        required: ['url']
    };

    private config: WebFetchToolConfig;

    constructor(config: WebFetchToolConfig = {}) {
        this.config = config;
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            const url = typeof args.url === 'string' ? args.url.trim() : '';
            if (!url) return { output: 'URL is required', isError: true };

            const cap = this.config.maxCharsCap || 100000;
            const defaultLimit = this.config.maxChars || 8000;
            const maxChars = Math.max(500, Math.min(cap, Number(args.maxChars || defaultLimit)));

            const timeout = (this.config.timeoutSeconds || 30) * 1000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                headers: { 'User-Agent': this.config.userAgent || 'PowerDirector/1.0 (+web_fetch)' },
                redirect: 'follow',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                return { output: `Fetch failed: HTTP ${response.status}`, isError: true };
            }

            const contentType = response.headers.get('content-type') || '';
            let body = await response.text();

            if (contentType.includes('text/html')) {
                // Basic HTML->text normalization without external parser dependency.
                body = body
                    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            if (body.length > maxChars) {
                body = `${body.slice(0, maxChars)}\n\n[truncated at ${maxChars} chars]`;
            }

            return { output: body };
        } catch (error: any) {
            const msg = error.name === 'AbortError' ? 'Fetch timed out' : error.message;
            return { output: `Web Fetch Error: ${msg}`, isError: true };
        }
    }
}

