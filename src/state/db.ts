// @ts-nocheck
import Database from 'better-sqlite3';
import { PowerDirectorError, ErrorCode } from '../reliability/errors.ts';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'powerdirector.db');

export class DatabaseManager {
    private db: Database.Database;

    constructor(dbPath?: string) {
        try {
            this.db = new Database(dbPath || DB_PATH);
            this.initSchema();
        } catch (error) {
            throw new PowerDirectorError(
                'Failed to initialize database',
                ErrorCode.UNKNOWN_ERROR,
                { cause: error }
            );
        }
    }

    private initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        metadata TEXT -- JSON
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        role TEXT,
        content TEXT, -- JSON serialization of content
        timestamp INTEGER,
        token_count INTEGER,
        metadata TEXT, -- JSON serialization of message metadata
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);

      CREATE TABLE IF NOT EXISTS usage_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        timestamp INTEGER,
        model TEXT,
        provider TEXT,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cache_read_tokens INTEGER DEFAULT 0,
        cache_write_tokens INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_usage_session ON usage_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_events(timestamp);
    `);

        // Schema migration for older installs that created messages without metadata.
        const messageColumns = this.db.prepare(`PRAGMA table_info(messages)`).all() as Array<{ name: string }>;
        const hasMetadataColumn = messageColumns.some((col) => col.name === 'metadata');
        if (!hasMetadataColumn) {
            this.db.exec(`ALTER TABLE messages ADD COLUMN metadata TEXT`);
        }
    }

    public getDb(): Database.Database {
        return this.db;
    }
}
