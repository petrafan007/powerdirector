import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Channel, ChannelMessage } from '../src/channels/base';
import { AutoReplyManager } from '../src/core/auto-reply';
import { Gateway } from '../src/core/gateway';
import type { Agent } from '../src/core/agent';
import { DatabaseManager } from '../src/state/db';
import { SessionManager } from '../src/state/session-manager';

class DummyChannel implements Channel {
    public id = 'dummy';
    public name = 'dummy';
    public type: 'messaging' = 'messaging';
    private messageHandler?: (msg: ChannelMessage) => void | Promise<void>;
    public sent: Array<{ recipient: string; content: string }> = [];

    async start(): Promise<void> { }
    async stop(): Promise<void> { }
    async send(recipientId: string, content: string | any): Promise<void> {
        this.sent.push({
            recipient: recipientId,
            content: typeof content === 'string' ? content : JSON.stringify(content)
        });
    }
    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }
    getStatus() {
        return { connected: true, running: true };
    }
    async probe() {
        return { ok: true };
    }

    async emit(content: string, senderId: string = 'user-1', replyToId: string = 'room-1') {
        if (!this.messageHandler) throw new Error('No message handler registered');
        await this.messageHandler({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            channelId: this.id,
            content,
            senderId,
            replyToId,
            timestamp: Date.now(),
            metadata: { isGroup: false }
        });
    }
}

async function runTest() {
    const manager = new AutoReplyManager({
        enabled: true,
        mode: 'rules',
        rules: [
            {
                id: 'cooldown-rule',
                pattern: 'hello',
                response: 'Hi {{senderId}}',
                cooldownSeconds: 5,
                continueToAgent: false
            }
        ]
    });

    const sampleMessage: ChannelMessage = {
        id: 'msg-1',
        channelId: 'dummy',
        content: 'hello there',
        senderId: 'sender-a',
        replyToId: 'room-1',
        timestamp: Date.now(),
        metadata: { room: { name: 'General' } }
    };

    const first = manager.evaluate({ message: sampleMessage, recipientId: 'room-1' });
    assert.strictEqual(first.matched, true);
    assert.strictEqual(first.response, 'Hi sender-a');
    assert.strictEqual(first.blockAgent, true);

    const second = manager.evaluate({ message: sampleMessage, recipientId: 'room-1' });
    assert.strictEqual(second.matched, true);
    assert.strictEqual(second.reason, 'cooldown');
    assert.strictEqual(second.blockAgent, false);

    manager.updateConfig({
        enabled: true,
        mode: 'away',
        awayMessage: 'Away notice for {{senderId}} in {{channelId}}',
        awayContinueToAgent: false,
        cooldownSeconds: 10
    });
    const awayFirst = manager.evaluate({ message: sampleMessage, recipientId: 'room-1' });
    assert.strictEqual(awayFirst.matched, true);
    assert.strictEqual(awayFirst.response, 'Away notice for sender-a in dummy');
    assert.strictEqual(awayFirst.blockAgent, true);

    const awaySecond = manager.evaluate({ message: sampleMessage, recipientId: 'room-1' });
    assert.strictEqual(awaySecond.matched, true);
    assert.strictEqual(awaySecond.reason, 'cooldown');
    assert.strictEqual(awaySecond.blockAgent, true);

    const dbPath = path.join(os.tmpdir(), `pd-autoreply-${Date.now()}.db`);
    const db = new DatabaseManager(dbPath);
    const sessionManager = new SessionManager(db);
    const agentCalls: string[] = [];
    const mockAgent = {
        async runStep(_sessionId: string, input?: string): Promise<string> {
            const normalized = String(input || '').trim();
            agentCalls.push(normalized);
            return `AGENT:${normalized}`;
        },
        async generateCompletion(prompt: string): Promise<string> {
            return prompt.slice(0, 20);
        },
        listTools(): string[] {
            return [];
        },
        async runTool(): Promise<string> {
            return '';
        }
    } as unknown as Agent;

    const gateway = new Gateway(sessionManager, mockAgent, {
        commandPolicy: {
            native: true,
            nativeSkills: true,
            bash: false,
            restart: false
        },
        messagePolicy: {
            ackReaction: ''
        }
    });
    gateway.autoReplyManager.updateConfig({
        enabled: true,
        mode: 'rules',
        rules: [
            {
                id: 'hello',
                pattern: 'hello',
                response: 'AUTO-HELLO {{senderId}}',
                match: 'contains',
                continueToAgent: false
            },
            {
                id: 'assist',
                pattern: 'assist',
                response: 'AUTO-ASSIST {{senderId}}',
                match: 'contains',
                continueToAgent: true
            }
        ]
    });

    const channel = new DummyChannel();
    gateway.registerChannel(channel, 'dummy');

    await channel.emit('hello there');
    assert.strictEqual(channel.sent.length, 1);
    assert.strictEqual(channel.sent[0].recipient, 'room-1');
    assert.strictEqual(channel.sent[0].content, 'AUTO-HELLO user-1');
    assert.strictEqual(agentCalls.length, 0);

    await channel.emit('assist please');
    assert.strictEqual(channel.sent.length, 3);
    assert.strictEqual(channel.sent[1].content, 'AUTO-ASSIST user-1');
    assert.strictEqual(channel.sent[2].content, 'AGENT:assist please');
    assert.strictEqual(agentCalls.length, 1);

    await channel.emit('/autoreply off');
    assert.strictEqual(channel.sent.length, 4);
    assert.ok(channel.sent[3].content.includes('Auto-reply override set to OFF'));

    await channel.emit('hello while off');
    assert.strictEqual(channel.sent.length, 5);
    assert.strictEqual(channel.sent[4].content, 'AGENT:hello while off');
    assert.strictEqual(agentCalls.length, 2);

    await channel.emit('/autoreply on');
    assert.strictEqual(channel.sent.length, 6);
    assert.ok(channel.sent[5].content.includes('Auto-reply override set to ON'));

    await channel.emit('hello after on');
    assert.strictEqual(channel.sent.length, 7);
    assert.strictEqual(channel.sent[6].content, 'AUTO-HELLO user-1');
    assert.strictEqual(agentCalls.length, 2);

    await channel.emit('/autoreply test hello test');
    assert.strictEqual(channel.sent.length, 8);
    assert.ok(channel.sent[7].content.includes('"matched": true'));
    assert.ok(channel.sent[7].content.includes('"ruleId": "hello"'));

    const sessions = sessionManager.listSessions();
    assert.ok(sessions.length >= 1);
    const session = sessionManager.getSession(sessions[0].id);
    assert.ok(session && session.messages.length >= 2);

    try {
        fs.unlinkSync(dbPath);
    } catch {
        // ignore cleanup failure
    }

    console.log(JSON.stringify({
        ruleMatchingAndCooldown: true,
        awayModeBlocking: true,
        gatewayRuleBlocksAgent: true,
        gatewayRuleContinueToAgent: true,
        commandOverrideOffOn: true,
        commandTestOutput: true
    }, null, 2));
}

runTest().catch((error) => {
    console.error(error);
    process.exit(1);
});
