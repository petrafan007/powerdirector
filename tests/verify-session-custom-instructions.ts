import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Agent } from '../src/core/agent';
import { Gateway } from '../src/core/gateway';
import { DatabaseManager } from '../src/state/db';
import { SessionManager } from '../src/state/session-manager';

async function runTest() {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-session-custom-instructions-'));
    const dbPath = path.join(tmpRoot, 'powerdirector.test.db');
    const db = new DatabaseManager(dbPath);
    const sessionManager = new SessionManager(db);

    const created = sessionManager.createSession('Custom Instructions Session', {
        customInstructions: 'Always answer with concise bullet points.'
    });
    assert.strictEqual(
        created.customInstructions,
        'Always answer with concise bullet points.',
        'createSession should persist custom instructions'
    );

    const updatedResult = sessionManager.updateSession(created.id, {
        customInstructions: 'Prioritize production-ready implementation details.'
    });
    assert.strictEqual(updatedResult.success, true, 'updateSession should update custom instructions');

    const loaded = sessionManager.getSession(created.id);
    assert.ok(loaded, 'session should load');
    assert.strictEqual(
        loaded!.session.customInstructions,
        'Prioritize production-ready implementation details.',
        'loaded session should include updated custom instructions'
    );

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
    const response = await gateway.processInput(created.id, 'test', {
        senderId: 'tester',
        channelId: 'api'
    });
    assert.strictEqual(response, 'ok');
    assert.ok(
        capturedSystemPrompt.includes('--- [SESSION CUSTOM INSTRUCTIONS] ---'),
        'gateway prompt should include custom instructions section marker'
    );
    assert.ok(
        capturedSystemPrompt.includes('Prioritize production-ready implementation details.'),
        'gateway prompt should include session custom instructions content'
    );

    const clearedResult = sessionManager.updateSession(created.id, {
        customInstructions: '   '
    });
    assert.strictEqual(clearedResult.success, true, 'updateSession should allow clearing custom instructions');
    assert.strictEqual(
        sessionManager.getSessionCustomInstructions(created.id),
        '',
        'custom instructions should clear when updated with blank text'
    );

    const noCustom = sessionManager.createSession('No Custom Instructions');
    await gateway.processInput(noCustom.id, 'hello', {
        senderId: 'tester',
        channelId: 'api'
    });
    assert.ok(
        !capturedSystemPrompt.includes('--- [SESSION CUSTOM INSTRUCTIONS] ---'),
        'gateway prompt should omit custom instructions marker when blank'
    );

    try {
        fs.unlinkSync(dbPath);
    } catch {
        // ignore cleanup failures
    }

    console.log(JSON.stringify({
        createPersistsCustomInstructions: true,
        editUpdatesCustomInstructions: true,
        gatewayInjectsCustomInstructionsPerSession: true,
        blankCustomInstructionsAreOmitted: true
    }, null, 2));
}

runTest().catch((error) => {
    console.error(error);
    process.exit(1);
});
