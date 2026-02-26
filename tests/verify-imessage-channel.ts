import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ChannelMessage } from '../src/channels/base';
import { IMessageChannel, normalizeIMessageHandle, parseIMessageTarget } from '../src/channels/imessage';

function createMockImsgBinary(tempDir: string, logPath: string): string {
    const scriptPath = path.join(tempDir, 'imsg-mock.js');
    const script = `#!/usr/bin/env node
const fs = require('node:fs');
const readline = require('node:readline');
const args = process.argv.slice(2);
const logPath = process.env.IMSG_MOCK_LOG || '';

function writeLog(entry) {
  if (!logPath) return;
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\\n');
}

if (args[0] === '--version') {
  console.log('imsg mock 1.0.0');
  process.exit(0);
}

if (args[0] === 'rpc' && args[1] === '--help') {
  console.log('Usage: imsg rpc');
  process.exit(0);
}

if (args[0] === 'rpc') {
  const rl = readline.createInterface({ input: process.stdin });
  let nextMessageId = 1;

  rl.on('line', (line) => {
    let req;
    try {
      req = JSON.parse(line);
    } catch {
      return;
    }

    writeLog({ event: 'request', method: req.method, params: req.params || {} });
    const reply = (payload) => {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: payload }) + '\\n');
    };
    const fail = (message) => {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { message } }) + '\\n');
    };

    if (req.method === 'chats.list') {
      reply({ chats: [{ id: 42, identifier: '+15550001111' }] });
      return;
    }
    if (req.method === 'watch.subscribe') {
      reply({ subscription: 9 });
      setTimeout(() => {
        const notification = {
          jsonrpc: '2.0',
          method: 'message',
          params: {
            message: {
              id: 101,
              chat_id: 42,
              sender: '+15550001111',
              is_from_me: false,
              text: 'hello from mock',
              created_at: '2026-02-16T00:00:00.000Z',
              attachments: [{ original_path: '/tmp/mock.jpg', mime_type: 'image/jpeg', missing: false }],
              is_group: false
            }
          }
        };
        process.stdout.write(JSON.stringify(notification) + '\\n');
      }, 20);
      return;
    }
    if (req.method === 'watch.unsubscribe') {
      reply({ ok: true });
      setTimeout(() => process.exit(0), 10);
      return;
    }
    if (req.method === 'send') {
      writeLog({ event: 'send', params: req.params || {} });
      reply({ messageId: 'mock-' + String(nextMessageId++) });
      return;
    }

    fail('unknown method');
  });

  rl.on('close', () => process.exit(0));
  return;
}

console.error('unknown command');
process.exit(1);
`;

    fs.writeFileSync(scriptPath, script, 'utf8');
    fs.chmodSync(scriptPath, 0o755);
    process.env.IMSG_MOCK_LOG = logPath;
    return scriptPath;
}

function readMockLog(logPath: string): Array<Record<string, any>> {
    if (!fs.existsSync(logPath)) return [];
    return fs.readFileSync(logPath, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

async function waitForInbound(channel: IMessageChannel, timeoutMs = 4000): Promise<ChannelMessage> {
    return await new Promise<ChannelMessage>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for inbound iMessage (${timeoutMs}ms)`)), timeoutMs);
        channel.onMessage((msg) => {
            clearTimeout(timer);
            resolve(msg);
        });
    });
}

async function runTest() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-imessage-'));
    const logPath = path.join(tempDir, 'imsg.log');
    const mockImsgPath = createMockImsgBinary(tempDir, logPath);

    try {
        assert.deepStrictEqual(parseIMessageTarget('chat:456'), { kind: 'chat_id', chatId: 456 });
        assert.deepStrictEqual(parseIMessageTarget('chatguid:abc-guid'), { kind: 'chat_guid', chatGuid: 'abc-guid' });
        assert.deepStrictEqual(parseIMessageTarget('sms:+1555'), { kind: 'handle', to: '+1555', service: 'sms' });
        assert.strictEqual(normalizeIMessageHandle('Name@Example.com'), 'name@example.com');
        assert.strictEqual(normalizeIMessageHandle(' +1 (555) 222-3333 '), '+15552223333');
        assert.strictEqual(normalizeIMessageHandle('Chat_Id:42'), 'chat_id:42');

        const channel = new IMessageChannel({
            cliPath: mockImsgPath,
            includeAttachments: true,
            service: 'auto',
            region: 'US',
            probeTimeoutMs: 3000,
            requestTimeoutMs: 3000
        });

        const probe = await channel.probe();
        assert.strictEqual(probe.ok, true, `Expected probe ok, got: ${probe.error || 'unknown error'}`);

        const inboundPromise = waitForInbound(channel);
        await channel.start();
        const inbound = await inboundPromise;

        assert.strictEqual(inbound.channelId, 'imessage');
        assert.strictEqual(inbound.senderId, '+15550001111');
        assert.strictEqual(inbound.replyToId, 'chat_id:42');
        assert.strictEqual(inbound.content, 'hello from mock');
        assert.ok(Array.isArray(inbound.metadata?.attachments) && inbound.metadata.attachments.length === 1);

        await channel.send('chat:42', 'hello chat alias');
        await channel.send('sms:+1 (555) 222-3333', 'hello sms');
        await channel.send('imessage:Name@Example.com', 'hello imessage');
        await channel.send('chatguid:ABC-GUID', 'hello guid');
        await channel.stop();

        // One-off send path (channel not started)
        const oneOff = new IMessageChannel({
            cliPath: mockImsgPath,
            service: 'auto',
            region: 'US',
            probeTimeoutMs: 3000,
            requestTimeoutMs: 3000
        });
        await oneOff.send('auto:+15550009999', 'hello one-off');

        const sends = readMockLog(logPath)
            .filter((entry) => entry.event === 'send')
            .map((entry) => entry.params);

        assert.strictEqual(sends.length, 5, `Expected 5 send calls, got ${sends.length}`);

        assert.strictEqual(sends[0].chat_id, 42);
        assert.strictEqual(sends[0].service, 'auto');
        assert.strictEqual(sends[0].region, 'US');

        assert.strictEqual(sends[1].to, '+15552223333');
        assert.strictEqual(sends[1].service, 'sms');

        assert.strictEqual(sends[2].to, 'name@example.com');
        assert.strictEqual(sends[2].service, 'imessage');

        assert.strictEqual(sends[3].chat_guid, 'ABC-GUID');
        assert.strictEqual(sends[3].service, 'auto');

        assert.strictEqual(sends[4].to, '+15550009999');
        assert.strictEqual(sends[4].service, 'auto');

        const missingBinaryProbe = await new IMessageChannel({
            cliPath: path.join(tempDir, 'missing-imsg')
        }).probe();
        assert.strictEqual(missingBinaryProbe.ok, false);
        assert.ok((missingBinaryProbe.error || '').includes('not found'));

        console.log(JSON.stringify({
            targetParsingParity: true,
            probeSuccess: true,
            inboundWatchMessageReceived: true,
            sendTargetResolution: true,
            oneOffSendPath: true,
            probeMissingBinaryFails: true
        }, null, 2));
    } finally {
        delete process.env.IMSG_MOCK_LOG;
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // ignore cleanup failures
        }
    }
}

runTest().catch((error) => {
    console.error(error);
    process.exit(1);
});
