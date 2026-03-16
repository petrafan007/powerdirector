// @ts-nocheck
import { Tool, ToolResult } from './base.js';
// @ts-ignore
import Tenor from 'tenorjs';

export class GifTool implements Tool {
    public name = 'gif';
    public description = 'Search for GIFs. Actions: search, trending.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['search', 'trending'] },
            query: { type: 'string', description: 'Search term' },
            limit: { type: 'number', default: 5 }
        },
        required: ['action']
    };

    private client: any;

    constructor(apiKey: string) {
        this.client = Tenor.client({
            "Key": apiKey, // https://tenor.com/developer/keyregistration
            "Filter": "off", // "off", "low", "medium", "high", not case sensitive
            "Locale": "en_US", // Your locale here, case-sensitivity depends on input
            "MediaFilter": "minimal", // "minimal", "basic", or "advanced", not case sensitive
            "DateFormat": "D/MM/YYYY - H:mm:ss A" // Change this accordingly
        });
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            if (args.action === 'search') {
                if (!args.query) return { output: 'Query required', isError: true };
                const results = await this.client.Search.Query(args.query, args.limit || 5);
                // @ts-ignore
                const urls = results.map(r => r.media[0].gif.url).join('\n');
                return { output: urls || 'No GIFs found.' };
            } else if (args.action === 'trending') {
                const results = await this.client.Trending.Example(args.limit || 5);
                // @ts-ignore
                const urls = results.map(r => r.media[0].gif.url).join('\n');
                return { output: urls || 'No trending GIFs found.' };
            }

            return { output: `Unknown action: ${args.action}`, isError: true };
        } catch (error: any) {
            return { output: `Gif Error: ${error.message}`, isError: true };
        }
    }
}
