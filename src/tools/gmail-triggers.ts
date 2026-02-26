// @ts-nocheck
import { Tool, ToolResult } from './base.js';
import { exec } from 'node:child_process';
import util from 'node:util';

const execAsync = util.promisify(exec);

export class GmailTriggerTool implements Tool {
    public name = 'gmail_triggers';
    public description = 'Monitor Gmail for new emails matching criteria. Actions: check_inbox, watch_label.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['check_inbox', 'watch_label'] },
            query: { type: 'string', description: 'Gmail search query (e.g. "is:unread from:boss")' },
            label: { type: 'string', description: 'Label to watch' },
            limit: { type: 'number', default: 5 }
        },
        required: ['action']
    };

    private credentials: { clientId: string; clientSecret: string; refreshToken: string };

    constructor(clientId: string, clientSecret: string, refreshToken: string) {
        this.credentials = { clientId, clientSecret, refreshToken };
    }

    private async getAccessToken(): Promise<string> {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.credentials.clientId,
                client_secret: this.credentials.clientSecret,
                refresh_token: this.credentials.refreshToken,
                grant_type: 'refresh_token'
            })
        });
        const data = await res.json() as any;
        return data.access_token;
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            const token = await this.getAccessToken();
            const headers = { Authorization: `Bearer ${token}` };

            switch (args.action) {
                case 'check_inbox': {
                    const query = encodeURIComponent(args.query || 'is:unread');
                    const limit = args.limit || 5;
                    const res = await fetch(
                        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${limit}`,
                        { headers }
                    );
                    const data = await res.json() as any;
                    const messages = data.messages || [];
                    if (messages.length === 0) return { output: 'No matching emails.' };

                    const details = [];
                    for (const msg of messages.slice(0, limit)) {
                        const msgRes = await fetch(
                            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
                            { headers }
                        );
                        const msgData = await msgRes.json() as any;
                        const getHeader = (name: string) =>
                            msgData.payload?.headers?.find((h: any) => h.name === name)?.value || '';
                        details.push(`From: ${getHeader('From')}\nSubject: ${getHeader('Subject')}\nDate: ${getHeader('Date')}`);
                    }
                    return { output: details.join('\n---\n') };
                }

                case 'watch_label': {
                    const label = args.label || 'INBOX';
                    // Gmail Push Notifications require a Pub/Sub topic
                    // For now, return instructions
                    return {
                        output: `To enable Gmail push notifications for label "${label}":\n1. Create a Google Cloud Pub/Sub topic\n2. Grant gmail-api-push@system.gserviceaccount.com publish rights\n3. Call users.watch with topicName\n\nFor polling: Use check_inbox with a cron schedule.`
                    };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Gmail Error: ${error.message}`, isError: true };
        }
    }
}
