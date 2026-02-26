import { DatabaseManager } from '../src/state/db';
import { SessionManager } from '../src/state/session-manager';
import { Message } from '../src/context/types';
import fs from 'fs';
import path from 'path';

// Cleanup old test DB
const DB_PATH = path.join(process.cwd(), 'powerdirector.db');
if (fs.existsSync(DB_PATH)) {
    try { fs.unlinkSync(DB_PATH); } catch { }
}

async function runTest() {
    console.log('Testing Session Manager...');
    const db = new DatabaseManager();
    const manager = new SessionManager(db);

    // 1. Create Session
    const session = manager.createSession('Test Session');
    console.log('Created Session:', session.id);

    // 2. Add Messages
    const msg1: Message = { role: 'user', content: 'Hello', timestamp: Date.now() };
    const msg2: Message = { role: 'assistant', content: 'Hi there', timestamp: Date.now() + 100 };

    manager.saveMessage(session.id, msg1);
    manager.saveMessage(session.id, msg2);
    console.log('Saved 2 messages');

    // 3. Load Session
    const loaded = manager.getSession(session.id);
    if (!loaded) throw new Error('Failed to load session');

    if (loaded.messages.length !== 2) throw new Error(`Expected 2 messages, got ${loaded.messages.length}`);
    if (loaded.messages[0].role !== 'user') throw new Error('Message order incorrect');
    console.log('Test 1 Passed: Persistence');

    // 4. List Sessions
    const list = manager.listSessions();
    if (list.length !== 1) throw new Error('List sessions failed');
    if (list[0].id !== session.id) throw new Error('Session list ID mismatch');
    console.log('Test 2 Passed: List Sessions');

    // 5. Delete Session
    manager.deleteSession(session.id);
    const deleted = manager.getSession(session.id);
    if (deleted) throw new Error('Session not deleted');
    console.log('Test 3 Passed: Deletion');
}

runTest().catch((err) => {
    console.error(err);
    process.exit(1);
});
