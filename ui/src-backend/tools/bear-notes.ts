// @ts-nocheck
import { Tool, ToolResult } from './base';
import { exec } from 'node:child_process';
import util from 'node:util';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { safeHomedir } from '../infra/os-safe';

const execAsync = util.promisify(exec);

export class BearNotesTool implements Tool {
    public name = 'bear_notes';
    public description = 'Manage Bear notes (macOS only). Actions: create_note, search_notes, get_note.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['create_note', 'search_notes', 'get_note'] },
            title: { type: 'string', description: 'Note title' },
            text: { type: 'string', description: 'Note content' },
            query: { type: 'string', description: 'Search term' },
            tags: { type: 'string', description: 'Comma-separated tags' }
        },
        required: ['action']
    };

    async execute(args: any): Promise<ToolResult> {
        if (os.platform() !== 'darwin') {
            return { output: 'Bear Notes is macOS only.', isError: true };
        }

        try {
            switch (args.action) {
                case 'create_note': {
                    if (!args.title) return { output: 'Title required', isError: true };
                    let url = `bear://x-callback-url/create?title=${encodeURIComponent(args.title)}`;
                    if (args.text) url += `&text=${encodeURIComponent(args.text)}`;
                    if (args.tags) {
                        const tagList = args.tags.split(',').map((t: string) => t.trim());
                        url += `&tags=${encodeURIComponent(tagList.join(','))}`;
                    }
                    await execAsync(`open "${url}"`);
                    return { output: `Created note: ${args.title}` };
                }

                case 'search_notes': {
                    if (!args.query) return { output: 'Query required', isError: true };
                    // Bear stores notes in a SQLite database
                    const dbPath = path.join(
                        safeHomedir(),
                        'Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'
                    );
                    if (!fs.existsSync(dbPath)) {
                        return { output: 'Bear database not found. Is Bear installed?', isError: true };
                    }
                    const { stdout } = await execAsync(
                        `sqlite3 "${dbPath}" "SELECT ZTITLE FROM ZSFNOTE WHERE ZTRASHED = 0 AND (ZTITLE LIKE '%${args.query.replace(/'/g, "''")}%' OR ZTEXT LIKE '%${args.query.replace(/'/g, "''")}%') LIMIT 10;"`
                    );
                    return { output: stdout.trim() || 'No matching notes.' };
                }

                case 'get_note': {
                    if (!args.title) return { output: 'Title required', isError: true };
                    const dbPath = path.join(
                        safeHomedir(),
                        'Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite'
                    );
                    if (!fs.existsSync(dbPath)) {
                        return { output: 'Bear database not found.', isError: true };
                    }
                    const { stdout } = await execAsync(
                        `sqlite3 "${dbPath}" "SELECT ZTEXT FROM ZSFNOTE WHERE ZTRASHED = 0 AND ZTITLE = '${args.title.replace(/'/g, "''")}' LIMIT 1;"`
                    );
                    return { output: stdout.trim() || 'Note not found.' };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Bear Error: ${error.message}`, isError: true };
        }
    }
}
