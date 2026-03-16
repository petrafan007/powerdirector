// @ts-nocheck
import { Tool, ToolResult } from './base.js';

export class EchoTool implements Tool {
    name: string = 'echo';
    description: string = 'Echoes back the input';
    parameters: any = {
        type: 'object',
        properties: {
            message: { type: 'string' }
        },
        required: ['message']
    };

    async execute(args: any): Promise<ToolResult> {
        return { output: args.message };
    }
}
