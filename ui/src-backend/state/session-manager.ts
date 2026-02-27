// @ts-nocheck
import { DatabaseManager } from './db.ts';

export interface ChatMessage {
    id?: number;
    role: string;
    content: string | any[];
    timestamp?: number;
    tokenCount?: number;
    metadata?: Record<string, any>;
}

export interface ChatSession {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    metadata: Record<string, any>;
    messages: ChatMessage[];
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

        return { id, name, createdAt: now, updatedAt: now, metadata, messages: [] };
    }

    public saveMessage(sessionId: string, message: ChatMessage): void {
        const db = this.dbManager.getDb();
        const contentStr = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
        const metadataStr = message.metadata ? JSON.stringify(message.metadata) : null;

        db.prepare('INSERT INTO messages (session_id, role, content, timestamp, token_count, metadata) VALUES (?, ?, ?, ?, ?, ?)')
            .run(
                sessionId,
                message.role,
                contentStr,
                message.timestamp || Date.now(),
                message.tokenCount || 0,
                metadataStr
            );
    }

    public getSession(id: string): ChatSession | null {
        const db = this.dbManager.getDb();
        const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
        if (!row) return null;

        const messageRows = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC, id ASC').all(id) as any[];
        const messages = messageRows.map(m => {
            let parsedContent = m.content;
            if (typeof parsedContent === 'string' && (parsedContent.startsWith('[') || parsedContent.startsWith('{'))) {
                try { parsedContent = JSON.parse(parsedContent); } catch (e) { }
            }
            return {
                id: m.id,
                role: m.role,
                content: parsedContent,
                timestamp: m.timestamp,
                tokenCount: m.token_count,
                metadata: m.metadata ? JSON.parse(m.metadata) : undefined
            };
        });

        return {
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: JSON.parse(row.metadata || '{}'),
            messages
        };
    }

    public listSessions(): ChatSession[] {
        const db = this.dbManager.getDb();
        const rows = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all() as any[];
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: JSON.parse(row.metadata || '{}'),
            messages: [] // We don't fetch all messages for all list operations for performance
        }));
    }

    public deleteSession(id: string): void {
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
