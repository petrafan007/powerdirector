const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

async function importSessions() {
    const homedir = process.env.HOME || os.homedir();
    const agentsDir = path.join(homedir, '.powerdirector', 'agents');
    const dbPath = process.env.POWERDIRECTOR_DB_PATH || path.join(homedir, 'powerdirector', 'powerdirector.db');

    if (!fs.existsSync(agentsDir)) {
        console.log(`Agents directory ${agentsDir} not found.`);
        return;
    }

    if (!fs.existsSync(dbPath)) {
        console.log(`Database file ${dbPath} not found.`);
        return;
    }

    const db = new Database(dbPath);
    console.log(`Connected to database at ${dbPath}`);

    const insertSession = db.prepare(`
        INSERT OR IGNORE INTO sessions (id, name, created_at, updated_at, metadata)
        VALUES (?, ?, ?, ?, ?)
    `);

    const insertMessage = db.prepare(`
        INSERT INTO messages (session_id, role, content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?)
    `);

    // Walk through agents directories
    const agents = fs.readdirSync(agentsDir);
    for (const agent of agents) {
        const sessionPaths = [
            path.join(agentsDir, agent, 'sessions'),
            path.join(agentsDir, agent, 'qmd', 'sessions')
        ];

        for (const sessionsDir of sessionPaths) {
            if (!fs.existsSync(sessionsDir)) continue;

            const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
            console.log(`Found ${files.length} sessions in ${sessionsDir}`);

            for (const file of files) {
                try {
                    const filePath = path.join(sessionsDir, file);
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                    const sessionId = content.id || path.basename(file, '.json');
                    const name = content.name || 'Imported Session';
                    const createdAt = content.createdAt || Date.now();
                    const updatedAt = content.updatedAt || Date.now();
                    const metadata = JSON.stringify({
                        ...(content.metadata || {}),
                        agentId: agent
                    });

                    console.log(`Importing session: ${name} (${sessionId}) from agent ${agent}`);

                    insertSession.run(sessionId, name, createdAt, updatedAt, metadata);

                    if (Array.isArray(content.messages)) {
                        for (const msg of content.messages) {
                            const role = msg.role || 'user';
                            const msgContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '');
                            const timestamp = msg.timestamp || Date.now();
                            const msgMetadata = JSON.stringify(msg.metadata || {});

                            try {
                                insertMessage.run(sessionId, role, msgContent, timestamp, msgMetadata);
                            } catch (e) {
                                // Probably duplicate message or something, ignore for now
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Failed to import ${file}:`, err);
                }
            }
        }
    }

    console.log('Import complete.');
    db.close();
}

importSessions().catch(console.error);
