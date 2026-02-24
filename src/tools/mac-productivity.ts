// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import { exec } from 'node:child_process';
import util from 'node:util';
import os from 'node:os';

const execAsync = util.promisify(exec);

export class MacProductivityTool implements Tool {
    public name = 'mac_productivity';
    public description = 'Manage Apple Notes and Reminders on macOS. Actions: create_note, create_reminder.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['create_note', 'create_reminder'] },
            content: { type: 'string', description: 'Note body or reminder title' },
            title: { type: 'string', description: 'Note title (optional)' },
            list: { type: 'string', description: 'Reminders list name (optional)' }
        },
        required: ['action', 'content']
    };

    async execute(args: any): Promise<ToolResult> {
        if (os.platform() !== 'darwin') {
            return { output: 'This tool only works on macOS.', isError: true };
        }

        try {
            switch (args.action) {
                case 'create_note':
                    // Simple AppleScript to create a note
                    // tell application "Notes" to make new note at folder "Notes" with properties {name:"Title", body:"Content"}
                    const noteTitle = args.title || 'New Note';
                    const noteBody = args.content;
                    const noteScript = `tell application "Notes" to make new note at folder "Notes" of account "iCloud" with properties {name:"${noteTitle}", body:"${noteBody}"}`;
                    // "iCloud" might not exist for everyone. Let's try "Notes" folder or default account.
                    // Safer: tell application "Notes" to make new note with properties {name: ... }
                    const safeNoteScript = `tell application "Notes" to make new note with properties {name:"${noteTitle}", body:"${noteBody}"}`;

                    await execAsync(`osascript -e '${safeNoteScript}'`);
                    return { output: 'Note created.' };

                case 'create_reminder':
                    const reminderTitle = args.content;
                    const listName = args.list;
                    let remScript = '';
                    if (listName) {
                        remScript = `tell application "Reminders" to make new reminder at list "${listName}" with properties {name:"${reminderTitle}"}`;
                    } else {
                        remScript = `tell application "Reminders" to make new reminder with properties {name:"${reminderTitle}"}`;
                    }
                    await execAsync(`osascript -e '${remScript}'`);
                    return { output: 'Reminder created.' };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Mac Productivity Error: ${error.message}`, isError: true };
        }
    }
}
