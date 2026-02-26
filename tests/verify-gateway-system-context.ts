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
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-gateway-context-'));
    const agentDir = path.join(tmpRoot, 'agent');
    fs.mkdirSync(agentDir, { recursive: true });

    const fileContents: Record<string, string> = {
        'AGENTS.md': '# AGENTS\nworkspace rules',
        'SOUL.md': '# SOUL\nidentity',
        'TOOLS.md': '# TOOLS\nlocal notes',
        'IDENTITY.md': '# IDENTITY\nname: Majeston',
        'USER.md': '# USER\nname: Human',
        'HEARTBEAT.md': '# HEARTBEAT\n- check inbox',
        // Intentionally lowercase to verify fallback resolution for MEMORY.md -> memory.md
        'memory.md': '# memory\nlowercase fallback'
    };

    for (const [name, content] of Object.entries(fileContents)) {
        fs.writeFileSync(path.join(agentDir, name), content, 'utf8');
    }

    const dbPath = path.join(tmpRoot, 'powerdirector.test.db');
    const db = new DatabaseManager(dbPath);
    const sessionManager = new SessionManager(db);

    let capturedSystemPrompt = '';
    const mockAgent = {
        async runStep(_sessionId: string, _input?: string, options?: { systemPrompt?: string }): Promise<string> {
            capturedSystemPrompt = options?.systemPrompt || '';
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

    const gateway = new Gateway(sessionManager, mockAgent);

    process.chdir(tmpRoot);
    try {
        const reply = await gateway.processInput('session-context', 'What context files are loaded?', {
            senderId: 'tester',
            channelId: 'api'
        });
        assert.strictEqual(reply, 'ok');
    } finally {
        process.chdir(originalCwd);
    }

    const expectedPresentPaths = [
        path.join(agentDir, 'AGENTS.md'),
        path.join(agentDir, 'SOUL.md'),
        path.join(agentDir, 'TOOLS.md'),
        path.join(agentDir, 'IDENTITY.md'),
        path.join(agentDir, 'USER.md'),
        path.join(agentDir, 'HEARTBEAT.md'),
        path.join(agentDir, 'memory.md')
    ];

    for (const fullPath of expectedPresentPaths) {
        assert.ok(
            capturedSystemPrompt.includes(`--- [CONTEXT: ${fullPath}] ---`),
            `Missing context header for ${fullPath}`
        );
    }

    const bootstrapPath = path.join(agentDir, 'BOOTSTRAP.md');
    assert.ok(
        capturedSystemPrompt.includes(`--- [CONTEXT: ${bootstrapPath}] ---`),
        'Missing BOOTSTRAP.md context header'
    );
    assert.ok(
        capturedSystemPrompt.includes(`[MISSING] Expected at: ${bootstrapPath}`),
        'Missing BOOTSTRAP.md missing-file marker'
    );

    assert.ok(
        !capturedSystemPrompt.includes(`[MISSING] Expected at: ${path.join(agentDir, 'AGENTS.md')}`),
        'AGENTS.md should not be marked missing'
    );
    assert.ok(
        !capturedSystemPrompt.includes(`[MISSING] Expected at: ${path.join(agentDir, 'HEARTBEAT.md')}`),
        'HEARTBEAT.md should not be marked missing'
    );

    try {
        fs.unlinkSync(dbPath);
    } catch {
        // ignore cleanup failures
    }

    console.log(JSON.stringify({
        loadsAgentsSoulToolsIdentityUserHeartbeat: true,
        loadsMemoryFallback: true,
        includesBootstrapMissingMarker: true
    }, null, 2));
}

runTest().catch((error) => {
    console.error(error);
    process.exit(1);
});
