// @ts-nocheck
import { Tool, ToolResult } from './base';
import { exec } from 'node:child_process';
import util from 'node:util';
import os from 'node:os';

const execAsync = util.promisify(exec);

export class Things3Tool implements Tool {
    public name = 'things3';
    public description = 'Manage Things 3 tasks (macOS only). Actions: add_todo, get_today, get_inbox, complete_todo.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['add_todo', 'get_today', 'get_inbox', 'complete_todo'] },
            title: { type: 'string', description: 'Todo title' },
            notes: { type: 'string', description: 'Todo notes' },
            project: { type: 'string', description: 'Project name' },
            tags: { type: 'string', description: 'Comma-separated tags' },
            deadline: { type: 'string', description: 'Deadline date (YYYY-MM-DD)' }
        },
        required: ['action']
    };

    async execute(args: any): Promise<ToolResult> {
        if (os.platform() !== 'darwin') {
            return { output: 'Things 3 is macOS only.', isError: true };
        }

        try {
            switch (args.action) {
                case 'add_todo': {
                    if (!args.title) return { output: 'Title required', isError: true };
                    // Things 3 URL scheme
                    let url = `things:///add?title=${encodeURIComponent(args.title)}`;
                    if (args.notes) url += `&notes=${encodeURIComponent(args.notes)}`;
                    if (args.project) url += `&list=${encodeURIComponent(args.project)}`;
                    if (args.tags) url += `&tags=${encodeURIComponent(args.tags)}`;
                    if (args.deadline) url += `&deadline=${args.deadline}`;

                    await execAsync(`open "${url}"`);
                    return { output: `Added todo: ${args.title}` };
                }

                case 'get_today': {
                    const script = `
                        tell application "Things3"
                            set todoList to to dos of list "Today"
                            set output to ""
                            repeat with t in todoList
                                set output to output & name of t & "\\n"
                            end repeat
                            return output
                        end tell
                    `;
                    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
                    return { output: stdout.trim() || 'No tasks for today.' };
                }

                case 'get_inbox': {
                    const script = `
                        tell application "Things3"
                            set todoList to to dos of list "Inbox"
                            set output to ""
                            repeat with t in todoList
                                set output to output & name of t & "\\n"
                            end repeat
                            return output
                        end tell
                    `;
                    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
                    return { output: stdout.trim() || 'Inbox is empty.' };
                }

                case 'complete_todo': {
                    if (!args.title) return { output: 'Title required', isError: true };
                    const script = `
                        tell application "Things3"
                            set matchingTodos to to dos whose name is "${args.title.replace(/"/g, '\\"')}"
                            if (count of matchingTodos) > 0 then
                                set status of item 1 of matchingTodos to completed
                                return "Completed: ${args.title.replace(/"/g, '\\"')}"
                            else
                                return "Not found: ${args.title.replace(/"/g, '\\"')}"
                            end if
                        end tell
                    `;
                    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
                    return { output: stdout.trim() };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Things 3 Error: ${error.message}`, isError: true };
        }
    }
}
