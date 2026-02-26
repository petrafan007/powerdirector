// @ts-nocheck
import { DatabaseManager } from './db.ts';

export interface ChatSession {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    metadata: Record<string, any>;
}

export class SessionManager {
    private dbManager: DatabaseManager;

    constructor(dbManager: DatabaseManager) {
        this.dbManager = dbManager;
    }

    public async createSession(name: string, metadata: Record<string, any> = {}): Promise<ChatSession> {
        const id = crypto.randomUUID();
        const now = Date.now();
        const db = this.dbManager.getDb();

        db.prepare('INSERT INTO sessions (id, name, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?)')
            .run(id, name, now, now, JSON.stringify(metadata));

        return { id, name, createdAt: now, updatedAt: now, metadata };
    }

    public async getSession(id: string): Promise<ChatSession | null> {
        const db = this.dbManager.getDb();
        const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
        if (!row) return null;

        return {
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: JSON.parse(row.metadata || '{}')
        };
    }

    public async listSessions(): Promise<ChatSession[]> {
        const db = this.dbManager.getDb();
        const rows = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all();
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }

    public async deleteSession(id: string): Promise<void> {
        const db = this.dbManager.getDb();
        db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    }

    public async updateSession(id: string, name?: string, metadata?: Record<string, any>): Promise<void> {
        const db = this.dbManager.getDb();
        const now = Date.now();
        if (name && metadata) {
            db.prepare('UPDATE sessions SET name = ?, metadata = ?, updated_at = ? WHERE id = ?')
                .run(name, JSON.stringify(metadata), now, id);
        } else if (name) {
            db.prepare('UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?')
                .run(name, now, id);
        } else if (metadata) {
            db.prepare('UPDATE sessions SET metadata = ?, updated_at = ? WHERE id = ?')
                .run(JSON.stringify(metadata), now, id);
        }
    }
}
