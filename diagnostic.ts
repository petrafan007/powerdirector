
import { Gateway } from './src/core/gateway';
import { SessionManager } from './src/state/session-manager';
import { DatabaseManager } from './src/state/db';
import { Agent } from './src/core/agent';
import { resolvePowerDirectorRoot } from './ui/lib/paths';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

async function test() {
    console.log('Starting diagnostic test...');
    const root = resolvePowerDirectorRoot();
    const dbPath = join(root, 'powerdirector.db');

    try {
        const db = new DatabaseManager(dbPath);
        const sm = new SessionManager(db);
        // We'll mock the Agent since we only want to test the Gateway's processInput logic
        const mockAgent = {
            runStep: async () => 'Mock Response'
        } as any;

        const gateway = new Gateway(sm, mockAgent, {
            sessionConfig: {
                scope: 'per-sender',
                dmScope: 'per-channel-peer',
                mainKey: 'test-main',
                identityLinks: {},
                sendPolicy: { rules: [] }
            },
            commandPolicy: { native: 'auto', nativeSkills: 'auto', bash: true, restart: true, allowFrom: [], ownerAllowFrom: [], useAccessGroups: false }
        });

        console.log('Calling processInput with /newchat...');
        const res = await gateway.processInput('some-old-session', '/newchat test message', {
            senderId: 'test-user',
            channelId: 'test-channel'
        });
        console.log('Result:', res);
        console.log('Test successful, no crash.');
    } catch (err) {
        console.error('CRASH DETECTED:');
        console.error(err);
        process.exit(1);
    }
}

test();
