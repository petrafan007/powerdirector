// @ts-nocheck
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import Database from "better-sqlite3";
import { createEmbeddingProvider, EmbeddingProvider } from './embeddings';
import { ResolvedMemorySearchConfig } from './config';
import {
    MemoryEmbeddingProbeResult,
    MemoryProviderStatus,
    MemorySearchManager,
    MemorySearchResult,
    MemorySource,
    MemorySyncProgressUpdate,
} from './types';
import {
    buildMemoryFileEntry,
    chunkMarkdown,
    cosineSimilarity,
    hashText,
    listMemoryFiles,
} from './internal';
import { resolveUserPath } from './utils';

type ChunkRow = {
    id: string;
    file_path: string;
    source: MemorySource;
    content: string;
    start_line: number;
    end_line: number;
    embedding_json: string | null;
};

type SessionDeltaSnapshot = {
    bytes: number;
    messages: number;
};

function parseMessageContent(raw: string): string {
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map((part) => {
                if (!part || typeof part !== "object") return "";
                if ((part as any).type === "text" && typeof (part as any).text === "string") {
                    return (part as any).text;
                }
                return "";
            }).join("\n").trim();
        }
        if (typeof parsed === "string") {
            return parsed;
        }
    } catch {
        // Fall through to raw text.
    }
    return raw;
}

function sessionDbPath(): string {
    return process.env.DB_PATH || path.join(process.cwd(), "powerdirector.db");
}

function trunc(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
        return text;
    }
    return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}

function uniqueByPath<T extends { path: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
        if (seen.has(item.path)) continue;
        seen.add(item.path);
        out.push(item);
    }
    return out;
}

export class SqliteVecBackend implements MemorySearchManager {
    private db: Database.Database | null = null;
    private provider: EmbeddingProvider | null = null;
    private requestedProvider: "openai" | "local" | "gemini" | "voyage" | "auto";
    private fallbackFrom?: "openai" | "local" | "gemini" | "voyage";
    private fallbackReason?: string;
    private vectorReady = false;
    private vectorLoadError?: string;
    private dirty = true;
    private sessionsDirty = false;
    private closed = false;
    private watchTimer: NodeJS.Timeout | null = null;
    private intervalTimer: NodeJS.Timeout | null = null;
    private watchers: fsSync.FSWatcher[] = [];
    private warmSessions = new Set<string>();
    private readonly sessionDeltas = new Map<string, SessionDeltaSnapshot>();

    constructor(
        private readonly agentId: string,
        private readonly config: ResolvedMemorySearchConfig,
        private readonly workspaceDir: string,
    ) {
        this.requestedProvider = config.provider;
    }

    public async initialize(): Promise<void> {
        const dbPath = resolveUserPath(
            this.config.store.path || `~/.powerdirector/memory/${this.agentId}.sqlite`,
        );
        await fs.mkdir(path.dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.ensureSchema();

        if (this.config.store.vector.enabled && this.config.store.vector.extensionPath) {
            try {
                this.db.loadExtension(this.config.store.vector.extensionPath);
                this.vectorReady = true;
                this.vectorLoadError = undefined;
            } catch (error: any) {
                this.vectorReady = false;
                this.vectorLoadError = String(error?.message || error || "unknown vector load error");
            }
        }

        const resolvedProvider = await createEmbeddingProvider({
            provider: this.config.provider,
            apiKey: this.config.remote?.apiKey,
            baseUrl: this.config.remote?.baseUrl,
            model: this.config.model,
            headers: this.config.remote?.headers,
            fallback: this.config.fallback,
            local: this.config.local,
        });
        this.provider = resolvedProvider.provider;
        this.requestedProvider = resolvedProvider.requestedProvider;
        this.fallbackFrom = resolvedProvider.fallbackFrom;
        this.fallbackReason = resolvedProvider.fallbackReason;

        this.setupWatchers();
        this.setupIntervalSync();
    }

    public async warmSession(sessionKey?: string): Promise<void> {
        if (!this.config.sync.onSessionStart) {
            return;
        }
        if (sessionKey && this.warmSessions.has(sessionKey)) {
            return;
        }
        if (sessionKey) {
            this.warmSessions.add(sessionKey);
            await this.touchSessionDelta(sessionKey);
        }
        void this.sync({ reason: "session-start" }).catch((error) => {
            console.warn(`[SqliteVecBackend] session-start sync failed: ${String(error)}`);
        });
    }

    public async search(
        query: string,
        opts?: {
            maxResults?: number;
            minScore?: number;
            sessionKey?: string;
            channelId?: string;
            chatType?: "channel" | "group" | "direct";
        },
    ): Promise<MemorySearchResult[]> {
        if (this.closed || !this.db || !this.config.enabled) {
            return [];
        }
        if (opts?.sessionKey) {
            await this.touchSessionDelta(opts.sessionKey);
        }
        if (this.config.sync.onSearch && (this.dirty || this.sessionsDirty)) {
            void this.sync({ reason: "search" }).catch((error) => {
                console.warn(`[SqliteVecBackend] search-triggered sync failed: ${String(error)}`);
            });
        }

        const cleaned = query.trim();
        if (!cleaned) {
            return [];
        }
        const maxResults = Math.max(
            1,
            Math.min(200, Math.floor(opts?.maxResults ?? this.config.query.maxResults)),
        );
        const minScore = Math.max(0, Math.min(1, opts?.minScore ?? this.config.query.minScore));
        const hybrid = this.config.query.hybrid;
        const candidateLimit = Math.max(
            maxResults,
            Math.min(400, Math.floor(maxResults * hybrid.candidateMultiplier)),
        );

        const sourceFilter = new Set<MemorySource>(this.config.sources);
        const rows = this.db.prepare(
            "SELECT id, file_path, source, content, start_line, end_line, embedding_json FROM chunks ORDER BY rowid DESC LIMIT ?",
        ).all(candidateLimit * 10) as ChunkRow[];
        const candidates = rows.filter((row) => sourceFilter.has(row.source));
        if (candidates.length === 0) {
            return [];
        }

        const terms = cleaned.toLowerCase().split(/\s+/).map((term) => term.trim()).filter(Boolean);
        const queryEmbedding = this.provider ? await this.embedCached(cleaned) : [];

        const scored = candidates.map((row) => {
            const keywordHits = terms.reduce((sum, term) => {
                if (!term) return sum;
                return sum + (row.content.toLowerCase().includes(term) ? 1 : 0);
            }, 0);
            const keywordScore = terms.length > 0 ? keywordHits / terms.length : 0;
            let vectorScore = 0;
            if (queryEmbedding.length > 0) {
                const embedding = row.embedding_json ? safeParseEmbedding(row.embedding_json) : [];
                if (embedding.length > 0) {
                    vectorScore = Math.max(0, cosineSimilarity(queryEmbedding, embedding));
                }
            }
            const finalScore = hybrid.enabled
                ? (vectorScore * hybrid.vectorWeight) + (keywordScore * hybrid.textWeight)
                : (queryEmbedding.length > 0 ? vectorScore : keywordScore);
            return { row, score: finalScore };
        });

        return scored
            .filter((entry) => Number.isFinite(entry.score) && entry.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults)
            .map((entry) => ({
                path: entry.row.file_path,
                startLine: entry.row.start_line,
                endLine: entry.row.end_line,
                score: entry.score,
                snippet: trunc(entry.row.content, 700),
                source: entry.row.source,
            }));
    }

    public async sync(params?: {
        reason?: string;
        force?: boolean;
        progress?: (update: MemorySyncProgressUpdate) => void;
    }): Promise<void> {
        if (this.closed || !this.db || !this.config.enabled) {
            return;
        }
        const files: Array<{
            path: string;
            source: MemorySource;
            content: string;
            mtimeMs: number;
            size: number;
            hash: string;
        }> = [];

        if (this.config.sources.includes("memory")) {
            const memoryFiles = await listMemoryFiles(this.workspaceDir, this.config.extraPaths);
            for (const file of memoryFiles) {
                try {
                    const entry = await buildMemoryFileEntry(file, this.workspaceDir);
                    const content = await fs.readFile(entry.absPath, "utf8");
                    files.push({
                        path: entry.path,
                        source: "memory",
                        content,
                        mtimeMs: entry.mtimeMs,
                        size: entry.size,
                        hash: entry.hash,
                    });
                } catch {
                    // ignore unreadable files
                }
            }
        }

        if (this.config.sources.includes("sessions")) {
            const sessionDocs = this.readSessionDocuments();
            files.push(...sessionDocs);
        }

        const uniqueFiles = uniqueByPath(files);
        params?.progress?.({
            completed: 0,
            total: uniqueFiles.length,
            label: "syncing-memory",
        });

        const chunkRows: Array<{
            id: string;
            filePath: string;
            source: MemorySource;
            content: string;
            startLine: number;
            endLine: number;
            embedding: number[] | null;
        }> = [];

        const shouldBatch = Boolean(this.provider && this.config.remote?.batch?.enabled);
        const now = Date.now();
        for (let i = 0; i < uniqueFiles.length; i += 1) {
            const file = uniqueFiles[i];
            const chunks = chunkMarkdown(file.content, this.config.chunking);
            const embeddings = this.provider
                ? await this.embedChunks(chunks.map((chunk) => chunk.text), shouldBatch)
                : new Array(chunks.length).fill(null);

            for (let idx = 0; idx < chunks.length; idx += 1) {
                const chunk = chunks[idx];
                const embedding = embeddings[idx] ?? null;
                chunkRows.push({
                    id: `${file.path}:${chunk.startLine}:${chunk.hash}`,
                    filePath: file.path,
                    source: file.source,
                    content: chunk.text,
                    startLine: chunk.startLine,
                    endLine: chunk.endLine,
                    embedding,
                });
            }
            params?.progress?.({
                completed: i + 1,
                total: uniqueFiles.length,
                label: `indexed:${file.path}`,
            });
        }

        const insertFile = this.db.prepare(
            "INSERT OR REPLACE INTO files(path, hash, mtime_ms, size, source) VALUES (?, ?, ?, ?, ?)",
        );
        const insertChunk = this.db.prepare(
            "INSERT OR REPLACE INTO chunks(id, file_path, source, model, content, start_line, end_line, embedding_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        );
        const deleteChunksBySource = this.db.prepare("DELETE FROM chunks WHERE source = ?");
        const deleteFilesBySource = this.db.prepare("DELETE FROM files WHERE source = ?");

        const providerModel = this.provider?.model || this.config.model || "memory-fallback";
        this.db.transaction(() => {
            if (this.config.sources.includes("memory")) {
                deleteChunksBySource.run("memory");
                deleteFilesBySource.run("memory");
            }
            if (this.config.sources.includes("sessions")) {
                deleteChunksBySource.run("sessions");
                deleteFilesBySource.run("sessions");
            }
            for (const file of uniqueFiles) {
                insertFile.run(file.path, file.hash, file.mtimeMs || now, file.size || 0, file.source);
            }
            for (const row of chunkRows) {
                insertChunk.run(
                    row.id,
                    row.filePath,
                    row.source,
                    providerModel,
                    row.content,
                    row.startLine,
                    row.endLine,
                    row.embedding ? JSON.stringify(row.embedding) : null,
                );
            }
        })();

        this.dirty = false;
        this.sessionsDirty = false;
    }

    public status(): MemoryProviderStatus {
        const files = this.db
            ? Number(
                (this.db.prepare("SELECT COUNT(*) AS c FROM files").get() as { c?: number } | undefined)?.c ?? 0,
            )
            : 0;
        const chunks = this.db
            ? Number(
                (this.db.prepare("SELECT COUNT(*) AS c FROM chunks").get() as { c?: number } | undefined)?.c ?? 0,
            )
            : 0;
        return {
            backend: "builtin",
            provider: this.provider?.id || "none",
            model: this.provider?.model || this.config.model || "none",
            requestedProvider: this.requestedProvider,
            files,
            chunks,
            dirty: this.dirty || this.sessionsDirty,
            workspaceDir: this.workspaceDir,
            dbPath: this.config.store.path,
            sources: [...this.config.sources],
            sourceCounts: this.buildSourceCounts(),
            vector: {
                enabled: this.config.store.vector.enabled,
                available: this.config.store.vector.enabled ? this.vectorReady : null,
                loadError: this.vectorLoadError,
                extensionPath: this.config.store.vector.extensionPath,
            },
            batch: {
                enabled: Boolean(this.config.remote?.batch?.enabled),
                failures: 0,
                limit: 0,
                wait: this.config.remote?.batch?.wait ?? true,
                concurrency: this.config.remote?.batch?.concurrency ?? 2,
                pollIntervalMs: this.config.remote?.batch?.pollIntervalMs ?? 2000,
                timeoutMs: (this.config.remote?.batch?.timeoutMinutes ?? 60) * 60_000,
            },
            custom: {
                storeDriverRequested: this.config.store.driver,
                fallbackFrom: this.fallbackFrom,
                fallbackReason: this.fallbackReason,
                sessionMemoryEnabled: this.config.experimental.sessionMemory,
            },
        };
    }

    public async probeEmbeddingAvailability(): Promise<MemoryEmbeddingProbeResult> {
        if (!this.provider) {
            return { ok: false, error: this.fallbackReason || "No embedding provider configured" };
        }
        try {
            await this.provider.embed("ping");
            return {
                ok: true,
                provider: this.provider.id,
                model: this.provider.model,
            };
        } catch (error: any) {
            return { ok: false, error: String(error?.message || error || "embedding probe failed") };
        }
    }

    public async close(): Promise<void> {
        this.closed = true;
        if (this.watchTimer) clearTimeout(this.watchTimer);
        if (this.intervalTimer) clearInterval(this.intervalTimer);
        for (const watcher of this.watchers) {
            try {
                watcher.close();
            } catch {
                // ignore
            }
        }
        this.watchers = [];
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    public add(text: string, metadata?: Record<string, any>): { id: string; text: string; createdAt: number } {
        const createdAt = Date.now();
        const id = `${createdAt}-${Math.random().toString(36).slice(2, 10)}`;
        const heading = metadata?.sessionId ? `session ${metadata.sessionId}` : "manual";
        const line = `- ${new Date(createdAt).toISOString()} [${heading}]: ${text}\n`;
        const filePath = path.join(this.workspaceDir, "MEMORY.md");
        fsSync.appendFileSync(filePath, line, "utf8");
        this.dirty = true;
        if (this.config.sync.onSearch) {
            void this.sync({ reason: "memory-add" }).catch(() => {});
        }
        return { id, text, createdAt };
    }

    public list(limit: number = 20): Array<{ id: string; text: string; createdAt: number }> {
        const filePath = path.join(this.workspaceDir, "MEMORY.md");
        if (!fsSync.existsSync(filePath)) {
            return [];
        }
        const raw = fsSync.readFileSync(filePath, "utf8");
        const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
        return lines.slice(-Math.max(1, limit)).reverse().map((line, index) => ({
            id: `memory-${index}`,
            text: line,
            createdAt: Date.now(),
        }));
    }

    public summarize(limit: number = 20): string {
        return this.list(limit).map((entry) => entry.text).join("\n");
    }

    private ensureSchema(): void {
        if (!this.db) return;
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS files (
                path TEXT PRIMARY KEY,
                hash TEXT,
                mtime_ms INTEGER,
                size INTEGER,
                source TEXT
            );
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                file_path TEXT,
                source TEXT,
                model TEXT,
                content TEXT,
                start_line INTEGER,
                end_line INTEGER,
                embedding_json TEXT
            );
            CREATE TABLE IF NOT EXISTS embedding_cache (
                provider TEXT,
                model TEXT,
                provider_key TEXT,
                hash TEXT,
                embedding_json TEXT,
                updated_at INTEGER,
                PRIMARY KEY(provider, model, provider_key, hash)
            );
        `);
    }

    private buildSourceCounts(): Array<{ source: MemorySource; files: number; chunks: number }> {
        if (!this.db) return [];
        const rows = this.db.prepare(
            "SELECT source, COUNT(*) AS chunks FROM chunks GROUP BY source",
        ).all() as Array<{ source: MemorySource; chunks: number }>;
        return rows.map((row) => ({
            source: row.source,
            files: Number(
                (this.db?.prepare("SELECT COUNT(*) AS c FROM files WHERE source = ?").get(row.source) as { c?: number } | undefined)?.c ?? 0,
            ),
            chunks: Number(row.chunks || 0),
        }));
    }

    private setupWatchers(): void {
        if (!this.config.sync.watch || !this.config.sources.includes("memory")) {
            return;
        }
        const watchTargets = new Set<string>([
            path.join(this.workspaceDir, "MEMORY.md"),
            path.join(this.workspaceDir, "memory.md"),
            path.join(this.workspaceDir, "memory"),
            ...this.config.extraPaths,
        ]);
        for (const target of watchTargets) {
            const resolved = path.isAbsolute(target) ? target : path.resolve(this.workspaceDir, target);
            try {
                const watcher = fsSync.watch(
                    resolved,
                    { persistent: false, recursive: false },
                    () => {
                        this.dirty = true;
                        this.scheduleWatchSync();
                    },
                );
                this.watchers.push(watcher);
            } catch {
                // ignore paths that cannot be watched
            }
        }
    }

    private setupIntervalSync(): void {
        const minutes = this.config.sync.intervalMinutes;
        if (!minutes || minutes <= 0) return;
        this.intervalTimer = setInterval(() => {
            void this.sync({ reason: "interval" }).catch((error) => {
                console.warn(`[SqliteVecBackend] interval sync failed: ${String(error)}`);
            });
        }, minutes * 60_000);
    }

    private scheduleWatchSync(): void {
        if (this.watchTimer) {
            clearTimeout(this.watchTimer);
        }
        this.watchTimer = setTimeout(() => {
            this.watchTimer = null;
            void this.sync({ reason: "watch" }).catch((error) => {
                console.warn(`[SqliteVecBackend] watch sync failed: ${String(error)}`);
            });
        }, this.config.sync.watchDebounceMs);
    }

    private async embedCached(text: string): Promise<number[]> {
        if (!this.provider || !this.db) return [];
        const contentHash = hashText(text);
        const providerKey = `${this.provider.id}:${this.provider.model}`;
        if (this.config.cache.enabled) {
            const hit = this.db.prepare(
                "SELECT embedding_json FROM embedding_cache WHERE provider = ? AND model = ? AND provider_key = ? AND hash = ?",
            ).get(this.provider.id, this.provider.model, providerKey, contentHash) as { embedding_json?: string } | undefined;
            if (hit?.embedding_json) {
                const parsed = safeParseEmbedding(hit.embedding_json);
                if (parsed.length > 0) {
                    return parsed;
                }
            }
        }

        const embedded = await this.provider.embed(text);
        if (this.config.cache.enabled) {
            this.db.prepare(
                `INSERT OR REPLACE INTO embedding_cache(provider, model, provider_key, hash, embedding_json, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
            ).run(
                this.provider.id,
                this.provider.model,
                providerKey,
                contentHash,
                JSON.stringify(embedded),
                Date.now(),
            );
            this.pruneEmbeddingCache();
        }
        return embedded;
    }

    private async embedChunks(chunks: string[], batchMode: boolean): Promise<Array<number[] | null>> {
        if (!this.provider) {
            return new Array(chunks.length).fill(null);
        }
        if (chunks.length === 0) return [];
        if (!batchMode || chunks.length === 1) {
            const out: Array<number[] | null> = [];
            for (const text of chunks) {
                try {
                    out.push(await this.embedCached(text));
                } catch {
                    out.push(null);
                }
            }
            return out;
        }

        const timeoutMs = (this.config.remote?.batch?.timeoutMinutes ?? 60) * 60_000;
        const concurrency = this.config.remote?.batch?.concurrency ?? 2;
        const wait = this.config.remote?.batch?.wait ?? true;
        const batchPromise = this.provider.embedBatch(chunks, { concurrency });
        const embeddings = await withTimeout(batchPromise, timeoutMs, "memory batch embedding timeout")
            .catch(async () => {
                if (!wait) {
                    return new Array<number[] | null>(chunks.length).fill(null);
                }
                const fallback: Array<number[] | null> = [];
                for (const text of chunks) {
                    try {
                        fallback.push(await this.embedCached(text));
                    } catch {
                        fallback.push(null);
                    }
                }
                return fallback;
            });
        return embeddings.map((value) => (Array.isArray(value) && value.length > 0 ? value : null));
    }

    private pruneEmbeddingCache(): void {
        if (!this.db || !this.config.cache.enabled) return;
        const maxEntries = this.config.cache.maxEntries;
        if (!maxEntries || maxEntries <= 0) return;
        const count = Number(
            (this.db.prepare("SELECT COUNT(*) AS c FROM embedding_cache").get() as { c?: number } | undefined)?.c ?? 0,
        );
        if (count <= maxEntries) return;
        const excess = count - maxEntries;
        this.db.prepare(
            "DELETE FROM embedding_cache WHERE rowid IN (SELECT rowid FROM embedding_cache ORDER BY updated_at ASC LIMIT ?)",
        ).run(excess);
    }

    private readSessionDocuments(): Array<{
        path: string;
        source: MemorySource;
        content: string;
        mtimeMs: number;
        size: number;
        hash: string;
    }> {
        if (!this.config.experimental.sessionMemory) {
            return [];
        }
        const dbPath = sessionDbPath();
        if (!fsSync.existsSync(dbPath)) {
            return [];
        }
        let db: Database.Database | null = null;
        try {
            db = new Database(dbPath, { readonly: true, fileMustExist: true });
            const sessions = db.prepare(
                "SELECT id, updated_at, name FROM sessions ORDER BY updated_at DESC LIMIT 200",
            ).all() as Array<{ id: string; updated_at: number; name: string }>;
            if (sessions.length === 0) return [];

            const messages = db.prepare(
                "SELECT session_id, role, content, timestamp FROM messages ORDER BY session_id ASC, timestamp ASC",
            ).all() as Array<{ session_id: string; role: string; content: string; timestamp: number }>;

            const grouped = new Map<string, Array<{ role: string; content: string; timestamp: number }>>();
            for (const row of messages) {
                const arr = grouped.get(row.session_id) || [];
                arr.push({
                    role: row.role,
                    content: parseMessageContent(row.content),
                    timestamp: row.timestamp,
                });
                grouped.set(row.session_id, arr);
            }

            const docs: Array<{
                path: string;
                source: MemorySource;
                content: string;
                mtimeMs: number;
                size: number;
                hash: string;
            }> = [];

            for (const session of sessions) {
                const history = grouped.get(session.id) || [];
                if (history.length === 0) continue;
                const lines = history.map((entry) => {
                    const stamp = new Date(entry.timestamp || session.updated_at).toISOString();
                    const body = entry.content.trim();
                    return `## ${entry.role.toUpperCase()} ${stamp}\n${body}`;
                });
                const content = lines.join("\n\n").trim();
                if (!content) continue;
                docs.push({
                    path: `sessions/${session.id}.md`,
                    source: "sessions",
                    mtimeMs: session.updated_at || Date.now(),
                    size: content.length,
                    hash: hashText(content),
                    content,
                });
            }
            return docs;
        } catch {
            return [];
        } finally {
            db?.close();
        }
    }

    private async touchSessionDelta(sessionKey: string): Promise<void> {
        if (!this.config.sources.includes("sessions")) {
            return;
        }
        const sessionId = sessionKey.trim();
        if (!sessionId) return;
        const dbPath = sessionDbPath();
        if (!fsSync.existsSync(dbPath)) return;
        let db: Database.Database | null = null;
        try {
            db = new Database(dbPath, { readonly: true, fileMustExist: true });
            const row = db.prepare(
                "SELECT COUNT(*) AS messages, COALESCE(SUM(LENGTH(content)), 0) AS bytes FROM messages WHERE session_id = ?",
            ).get(sessionId) as { messages?: number; bytes?: number } | undefined;
            const snapshot: SessionDeltaSnapshot = {
                messages: Number(row?.messages ?? 0),
                bytes: Number(row?.bytes ?? 0),
            };
            const prev = this.sessionDeltas.get(sessionId);
            if (!prev) {
                this.sessionDeltas.set(sessionId, snapshot);
                return;
            }
            const deltaMessages = snapshot.messages - prev.messages;
            const deltaBytes = snapshot.bytes - prev.bytes;
            const limitMessages = this.config.sync.sessions.deltaMessages;
            const limitBytes = this.config.sync.sessions.deltaBytes;
            if (deltaMessages >= limitMessages || deltaBytes >= limitBytes) {
                this.sessionsDirty = true;
                this.sessionDeltas.set(sessionId, snapshot);
            }
        } catch {
            // ignore session delta failures
        } finally {
            db?.close();
        }
    }
}

function safeParseEmbedding(raw: string): number[] {
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((value) => typeof value === "number" && Number.isFinite(value));
    } catch {
        return [];
    }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timeout: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
