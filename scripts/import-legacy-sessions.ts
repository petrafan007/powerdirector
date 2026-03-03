import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseManager } from '../src/state/db.ts';
import { SessionManager } from '../src/state/session-manager.ts';

async function importSessions() {
    const homedir = process.env.HOME || os.homedir();
    const sessionsDir = path.join(homedir, '.powerdirector', 'sessions');
    const dbPath = path.join(homedir, '.powerdirector', 'powerdirector.db');

    if (!fs.existsSync(sessionsDir)) {
        console.log(`Sessions directory ${sessionsDir} not found.`);
        return;
    }

    const dbManager = new DatabaseManager(dbPath);
    const sessionManager = new SessionManager(dbManager);

    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} legacy sessions.`);

    for (const file of files) {
        try {
            const filePath = path.join(sessionsDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // Assuming the JSON format matches the Session interface roughly
            // or has a 'messages' array and 'name'
            const sessionId = content.id || path.basename(file, '.json');
            const name = content.name || 'Imported Session';

            console.log(`Importing session: ${name} (${sessionId})`);

            // Create session in DB
            sessionManager.createSession(name, {
                id: sessionId,
                customInstructions: content.customInstructions,
                metadata: content.metadata
            });

            if (Array.isArray(content.messages)) {
                for (const msg of content.messages) {
                    sessionManager.saveMessage(sessionId, msg);
                }
            }
        } catch (err) {
            console.error(`Failed to import ${file}:`, err);
        }
    }

    console.log('Import complete.');
}

importSessions().catch(console.error);
