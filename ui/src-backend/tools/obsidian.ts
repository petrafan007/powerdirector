// @ts-nocheck
import { Tool, ToolResult } from './base.js';
import fs from 'fs';
import path from 'path';

export class ObsidianTool implements Tool {
    public name = 'obsidian';
    public description = 'Manage Obsidian notes. Actions: append_daily, read_note, search_notes, create_note.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['append_daily', 'read_note', 'search_notes', 'create_note'] },
            text: { type: 'string', description: 'Content to append or create' },
            filename: { type: 'string', description: 'Note filename (without .md)' },
            query: { type: 'string', description: 'Search term' }
        },
        required: ['action']
    };

    private vaultPath: string;

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
    }

    private getDailyNotePath(): string {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const filename = `${year}-${month}-${day}.md`;

        const dailyFolder = path.join(this.vaultPath, 'Daily');
        if (fs.existsSync(dailyFolder)) {
            return path.join(dailyFolder, filename);
        }
        return path.join(this.vaultPath, filename);
    }

    /** Recursively find all .md files in the vault */
    private findMarkdownFiles(dir: string): string[] {
        const results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                results.push(...this.findMarkdownFiles(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                results.push(path.relative(this.vaultPath, fullPath));
            }
        }
        return results;
    }

    async execute(args: any): Promise<ToolResult> {
        if (!fs.existsSync(this.vaultPath)) {
            return { output: `Vault path not found: ${this.vaultPath}`, isError: true };
        }

        try {
            switch (args.action) {
                case 'append_daily': {
                    if (!args.text) return { output: 'Text required', isError: true };
                    const dailyPath = this.getDailyNotePath();
                    const time = new Date().toLocaleTimeString();
                    const entry = `\n- [ ] ${time}: ${args.text}`;

                    if (!fs.existsSync(dailyPath)) {
                        await fs.promises.writeFile(dailyPath, `# Daily Note ${path.basename(dailyPath, '.md')}\n${entry}`);
                    } else {
                        await fs.promises.appendFile(dailyPath, entry);
                    }
                    return { output: `Appended to ${path.basename(dailyPath)}` };
                }

                case 'read_note': {
                    if (!args.filename) return { output: 'Filename required', isError: true };
                    const safeName = path.basename(args.filename).replace(/\.md$/, '');
                    const allFiles = this.findMarkdownFiles(this.vaultPath);
                    const match = allFiles.find(f => path.basename(f, '.md') === safeName);

                    if (!match) return { output: 'Note not found.', isError: true };

                    const content = await fs.promises.readFile(path.join(this.vaultPath, match), 'utf-8');
                    return { output: content };
                }

                case 'create_note': {
                    if (!args.filename || !args.text) return { output: 'Filename and text required', isError: true };
                    const newSafeName = path.basename(args.filename).replace(/\.md$/, '');
                    const newPath = path.join(this.vaultPath, `${newSafeName}.md`);
                    if (fs.existsSync(newPath)) return { output: 'Note already exists.', isError: true };

                    await fs.promises.writeFile(newPath, args.text);
                    return { output: `Created note: ${newSafeName}` };
                }

                case 'search_notes': {
                    if (!args.query) return { output: 'Query required', isError: true };
                    const mdFiles = this.findMarkdownFiles(this.vaultPath);
                    const results: string[] = [];
                    for (const file of mdFiles) {
                        const txt = await fs.promises.readFile(path.join(this.vaultPath, file), 'utf-8');
                        if (txt.includes(args.query)) {
                            results.push(file);
                        }
                        if (results.length > 10) break;
                    }
                    return { output: results.join('\n') || 'No matches found.' };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Obsidian Error: ${error.message}`, isError: true };
        }
    }
}
