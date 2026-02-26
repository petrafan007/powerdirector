// @ts-nocheck
import { DatabaseManager } from './db.ts';

export interface UsageEvent {
    sessionId?: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    cost: number;
    timestamp: number;
}

export class UsageManager {
    private dbManager: DatabaseManager;

    constructor(dbManager: DatabaseManager) {
        this.dbManager = dbManager;
    }

    public async logUsage(event: Omit<UsageEvent, 'timestamp'>): Promise<void> {
        const db = this.dbManager.getDb();
        const timestamp = Date.now();

        db.prepare(`
      INSERT INTO usage_events (
        session_id, timestamp, model, provider, 
        input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            event.sessionId || null,
            timestamp,
            event.model,
            event.provider,
            event.inputTokens,
            event.outputTokens,
            event.cacheReadTokens || 0,
            event.cacheWriteTokens || 0,
            event.cost
        );
    }

    public async getUsageForSession(sessionId: string): Promise<UsageEvent[]> {
        const db = this.dbManager.getDb();
        const rows = db.prepare('SELECT * FROM usage_events WHERE session_id = ?').all(sessionId);
        return rows.map(row => ({
            sessionId: row.session_id,
            timestamp: row.timestamp,
            model: row.model,
            provider: row.provider,
            inputTokens: row.input_tokens,
            outputTokens: row.output_tokens,
            cacheReadTokens: row.cache_read_tokens,
            cacheWriteTokens: row.cache_write_tokens,
            cost: row.cost
        }));
    }
}
