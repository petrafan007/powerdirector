// @ts-nocheck
import { Tool, ToolResult } from './base.js';
import { exec } from 'node:child_process';
import util from 'node:util';

const execAsync = util.promisify(exec);

export class OnePasswordTool implements Tool {
    public name = 'one_password';
    public description = 'Retrieve items from 1Password CLI (op). Actions: get_item.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['get_item'] },
            vault: { type: 'string', description: 'Vault name (optional)' },
            item: { type: 'string', description: 'Item name or ID' }
        },
        required: ['action', 'item']
    };

    async execute(args: any): Promise<ToolResult> {
        try {
            // Check if op CLI is installed
            try {
                await execAsync('op --version');
            } catch (e) {
                return { output: '1Password CLI (op) not found or not in PATH.', isError: true };
            }

            switch (args.action) {
                case 'get_item':
                    const vaultFlag = args.vault ? `--vault "${args.vault}"` : '';
                    // Retrieve JSON format
                    const { stdout } = await execAsync(`op item get "${args.item}" ${vaultFlag} --format json`);
                    const itemData = JSON.parse(stdout);

                    // Filter sensitive data? ideally agent shouldn't log passwords unless asked. 
                    // But tool returns raw data. The Agent decides what to do.
                    // Let's return a summarized version to be safe, or specific fields if requested?
                    // For now, return the full JSON but warn the model.
                    return { output: JSON.stringify(itemData, null, 2) };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `1Password Error: ${error.message}`, isError: true };
        }
    }
}
