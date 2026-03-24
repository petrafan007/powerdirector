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

export interface SessionMessageQueryOptions {
    limit?: number;
    maxContentChars?: number;
}

export interface SessionMessageQueryResult {
    messages: ChatMessage[];
    totalCount: number;
    hasMore: boolean;
}

type SessionRow = {
    id: string;
    name: string;
    created_at: number;
    updated_at: number;
    metadata: string | null;
};

type MessageRow = {
    id: number;
    role: string;
    content: string | null;
    timestamp: number;
    token_count: number | null;
    metadata: string | null;
    content_length?: number | null;
};

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
        const session = this.getSessionSummary(id);
        if (!session) return null;

        const messages = this.getSessionMessages(id).messages;
        return {
            ...session,
            messages
        };
    }

    public getSessionSummary(id: string): ChatSession | null {
        const db = this.dbManager.getDb();
        const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;
        if (!row) return null;

        return {
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: this.parseMetadata(row.metadata),
            messages: []
        };
    }

    public getSessionMessages(id: string, options: SessionMessageQueryOptions = {}): SessionMessageQueryResult {
        const db = this.dbManager.getDb();
        const limit = this.normalizePositiveInteger(options.limit);

        const messageCountRow = db.prepare(
            'SELECT count(*) AS count FROM messages WHERE session_id = ?'
        ).get(id) as { count?: number } | undefined;
        const totalCount = messageCountRow?.count ?? 0;

        let rows: MessageRow[];
        if (typeof limit === 'number') {
            rows = db.prepare(`
                SELECT
                    id,
                    role,
                    content,
                    timestamp,
                    token_count,
                    metadata,
                    length(content) AS content_length
                FROM messages
                WHERE session_id = ?
                ORDER BY timestamp ASC, id ASC
                LIMIT ?
            `).all(id, limit + 1) as MessageRow[];
        } else {
            rows = db.prepare(`
                SELECT
                    id,
                    role,
                    content,
                    timestamp,
                    token_count,
                    metadata,
                    length(content) AS content_length
                FROM messages
                WHERE session_id = ?
                ORDER BY timestamp ASC, id ASC
            `).all(id) as MessageRow[];
        }

        const hasMore = typeof limit === 'number' ? rows.length > limit : false;
        const visibleRows = hasMore && typeof limit === 'number' ? rows.slice(0, limit) : rows;

        return {
            messages: visibleRows.map((row) => this.mapMessageRow(row, options)),
            totalCount,
            hasMore
        };
    }

    public getLatestAssistantMessage(id: string, options: SessionMessageQueryOptions & { scanLimit?: number } = {}): ChatMessage | null {
        const db = this.dbManager.getDb();
        const scanLimit = this.normalizePositiveInteger(options.scanLimit) ?? 64;
        const rows = db.prepare(`
            SELECT
                id,
                role,
                content,
                timestamp,
                token_count,
                metadata,
                length(content) AS content_length
            FROM messages
            WHERE session_id = ?
            ORDER BY timestamp DESC, id DESC
            LIMIT ?
        `).all(id, scanLimit) as MessageRow[];

        for (const row of rows) {
            if (row.role !== 'assistant') continue;
            const message = this.mapMessageRow(row, options);
            if (message.metadata?.callId) continue;
            return message;
        }

        return null;
    }

    public listSessions(): ChatSession[] {
        const db = this.dbManager.getDb();
        const rows = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all() as any[];
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: this.parseMetadata(row.metadata),
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

    public updateMessageMetadata(sessionId: string, timestamp: number, metadata: Record<string, any>): void {
        const db = this.dbManager.getDb();
        db.prepare('UPDATE messages SET metadata = ? WHERE session_id = ? AND timestamp = ?')
            .run(JSON.stringify(metadata), sessionId, timestamp);
    }

    public setSessionMetadata(id: string, metadata: Record<string, any>): void {
        const session = this.getSessionSummary(id);
        if (!session) return;
        const newMetadata = { ...session.metadata, ...metadata };
        const db = this.dbManager.getDb();
        db.prepare('UPDATE sessions SET metadata = ?, updated_at = ? WHERE id = ?')
            .run(JSON.stringify(newMetadata), Date.now(), id);
    }

    public clearSession(id: string): void {
        const db = this.dbManager.getDb();
        db.prepare('DELETE FROM messages WHERE session_id = ?').run(id);
        db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(Date.now(), id);
    }

    public compactSession(id: string, summary: string, keepLastN: number): void {
        const db = this.dbManager.getDb();
        const messages = db.prepare('SELECT id FROM messages WHERE session_id = ? ORDER BY timestamp ASC, id ASC').all(id) as any[];
        
        if (messages.length <= keepLastN) return;
        
        const toDelete = messages.slice(0, messages.length - keepLastN);
        const deleteIds = toDelete.map(m => m.id);
        
        if (deleteIds.length > 0) {
            const placeholders = deleteIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).run(...deleteIds);
        }

        const insertedAt = Date.now();

        // Add the compacted baseline exactly where compaction happened so the UI
        // keeps it in chronological order with the surrounding run output.
        this.saveMessage(id, {
            role: 'system',
            content: `[Session Summary]: ${summary}`,
            timestamp: insertedAt,
            metadata: {
                type: 'summary',
                sequence: insertedAt * 1000
            }
        });
    }

    public renameSession(id: string, name: string): void {
        const db = this.dbManager.getDb();
        db.prepare('UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?')
            .run(name, Date.now(), id);
    }

    private parseMetadata(raw: string | null): Record<string, any> {
        if (typeof raw !== 'string' || raw.trim().length === 0) {
            return {};
        }
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return {};
            }
            return parsed;
        } catch {
            return {};
        }
    }

    private normalizePositiveInteger(value: number | undefined): number | undefined {
        if (!Number.isFinite(value) || value === undefined) {
            return undefined;
        }
        const normalized = Math.floor(value);
        return normalized > 0 ? normalized : undefined;
    }

    private mapMessageRow(row: MessageRow, options: SessionMessageQueryOptions = {}): ChatMessage {
        return {
            id: row.id,
            role: row.role,
            content: this.parseMessageContent(row.content, options.maxContentChars, row.content_length),
            timestamp: row.timestamp,
            tokenCount: row.token_count ?? undefined,
            metadata: this.parseMetadata(row.metadata)
        };
    }

    private parseMessageContent(
        rawContent: string | null,
        maxContentChars?: number,
        contentLength?: number | null
    ): string | any[] | Record<string, any> {
        if (rawContent == null) {
            return '';
        }

        const resolvedLength = typeof contentLength === 'number' && Number.isFinite(contentLength)
            ? contentLength
            : rawContent.length;
        const maxLength = this.normalizePositiveInteger(maxContentChars);
        if (typeof maxLength === 'number' && resolvedLength > maxLength) {
            return `[Message truncated: ${resolvedLength} chars]`;
        }

        const trimmed = rawContent.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                return JSON.parse(rawContent);
            } catch {
                return rawContent;
            }
        }

        return rawContent;
    }
}
