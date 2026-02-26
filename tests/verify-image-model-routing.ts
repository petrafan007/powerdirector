import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Agent } from '../src/core/agent';
import { Gateway } from '../src/core/gateway';
import { DatabaseManager } from '../src/state/db';
import { SessionManager } from '../src/state/session-manager';

async function runTest() {
    const originalCwd = process.cwd();
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-image-model-routing-'));
    const agentDir = path.join(tmpRoot, 'agent');
    fs.mkdirSync(agentDir, { recursive: true });
    for (const name of ['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md', 'USER.md', 'HEARTBEAT.md']) {
        fs.writeFileSync(path.join(agentDir, name), `# ${name}\n`, 'utf8');
    }

    const dbPath = path.join(tmpRoot, 'powerdirector.test.db');
    const db = new DatabaseManager(dbPath);
    const sessionManager = new SessionManager(db);

    const seenModelHints: string[] = [];
    const mockAgent = {
        async runStep(_sessionId: string, _input?: string, options?: { modelHint?: string }): Promise<string> {
            seenModelHints.push(options?.modelHint || '');
            return 'ok';
        },
        async generateCompletion(): Promise<string> {
            return 'ok';
        },
        listTools(): string[] {
            return [];
        },
        async runTool(): Promise<string> {
            return '';
        }
    } as unknown as Agent;

    const gateway = new Gateway(sessionManager, mockAgent, {
        imageModelHint: 'google-gemini-cli/gemini-3-flash-preview'
    });

    process.chdir(tmpRoot);
    try {
        await gateway.processInput('session-image-routing', 'plain text', {
            senderId: 'tester',
            channelId: 'api',
            metadata: {
                model: 'openai-codex/gpt-5.3-codex'
            }
        });

        await gateway.processInput('session-image-routing', 'look at this image', {
            senderId: 'tester',
            channelId: 'api',
            metadata: {
                model: 'openai-codex/gpt-5.3-codex',
                attachments: [
                    {
                        name: 'test.png',
                        type: 'image/png',
                        size: 10,
                        category: 'image',
                        data: Buffer.from('abc').toString('base64')
                    }
                ]
            }
        });
    } finally {
        process.chdir(originalCwd);
    }

    assert.strictEqual(seenModelHints[0], 'openai-codex/gpt-5.3-codex');
    assert.strictEqual(seenModelHints[1], 'google-gemini-cli/gemini-3-flash-preview');

    try {
        fs.unlinkSync(dbPath);
    } catch {
        // ignore cleanup failures
    }

    console.log(JSON.stringify({
        preservesTextOnlyModelHint: true,
        overridesToImageModelWhenAttachmentsPresent: true
    }, null, 2));
}

runTest().catch((error) => {
    console.error(error);
    process.exit(1);
});
