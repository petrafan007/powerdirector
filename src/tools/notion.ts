// @ts-nocheck
import { Client } from '@notionhq/client';
import { Tool, ToolResult } from './base.ts';

export class NotionTool implements Tool {
    public name = 'notion';
    public description = 'Interact with Notion workspace. Actions: search, read_page.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['search', 'read_page'] },
            query: { type: 'string', description: 'Search query' },
            pageId: { type: 'string', description: 'Page ID to read' }
        },
        required: ['action']
    };

    private client: Client;

    constructor(apiKey: string) {
        this.client = new Client({ auth: apiKey });
    }

    async execute(args: any): Promise<ToolResult> {
        if (!args.action) return { output: 'Action required', isError: true };

        try {
            switch (args.action) {
                case 'search':
                    const searchResponse = await this.client.search({
                        query: args.query,
                        page_size: 5
                    });
                    return { output: JSON.stringify(searchResponse.results, null, 2) };

                case 'read_page':
                    if (!args.pageId) return { output: 'Page ID required', isError: true };
                    const page = await this.client.pages.retrieve({ page_id: args.pageId });
                    // Also get blocks? For brevity, just page meta for now.
                    return { output: JSON.stringify(page, null, 2) };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Notion Error: ${error.message}`, isError: true };
        }
    }
}
