// @ts-nocheck
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import {
    MemorySearchManager,
    MemorySearchResult,
    MemorySyncProgressUpdate,
    MemoryProviderStatus,
    MemorySource,
} from "./types";
import { ResolvedQmdConfig } from "./config";
import { hashText } from "./internal";
import { resolveUserPath } from "./utils";

const MAX_QMD_OUTPUT_CHARS = 200_000;
const DEFAULT_SESSION_COLLECTION = "sessions";

type ScopeRule = {
    action: "allow" | "deny";
    match?: {
        channel?: string;
        chatType?: "channel" | "group" | "direct";
        keyPrefix?: string;
        rawKeyPrefix?: string;
    };
};

type QmdScope = {
    default?: "allow" | "deny";
    rules?: ScopeRule[];
};

type SessionExportRecord = {
    id: string;
    hash: string;
    updatedAt: number;
    filePath: string;
};

function appendOutputWithCap(
    current: string,
    chunk: string,
    maxChars: number,
): { text: string; truncated: boolean } {
    const appended = current + chunk;
    if (appended.length <= maxChars) {
        return { text: appended, truncated: false };
    }
    return { text: appended.slice(-maxChars), truncated: true };
}

function parseCommand(raw: string): { command: string; args: string[] } {
    const trimmed = raw.trim();
    if (!trimmed) {
        return { command: "qmd", args: [] };
    }
    const parts: string[] = [];
    let current = "";
    let quote: "'" | '"' | null = null;
    for (let i = 0; i < trimmed.length; i += 1) {
        const ch = trimmed[i]!;
        if (quote) {
            if (ch === quote) {
                quote = null;
            } else if (ch === "\\" && i + 1 < trimmed.length) {
                i += 1;
                current += trimmed[i];
            } else {
                current += ch;
            }
            continue;
        }
        if (ch === "'" || ch === '"') {
            quote = ch;
            continue;
        }
        if (/\s/.test(ch)) {
            if (current) {
                parts.push(current);
                current = "";
            }
            continue;
        }
        current += ch;
    }
    if (current) parts.push(current);
    if (parts.length === 0) {
        return { command: "qmd", args: [] };
    }
    return { command: parts[0], args: parts.slice(1) };
}

function parseSessionScope(sessionKey?: string): {
    normalizedKey?: string;
    channel?: string;
    chatType?: "channel" | "group" | "direct";
} {
    if (!sessionKey?.trim()) {
        return {};
    }
    const raw = sessionKey.trim().toLowerCase();
    const normalized = raw.replace(/^session_[^_]+_/, "");
    const parts = normalized.split(/[_:]/).filter(Boolean);
    const channel = parts[0] || undefined;
    let chatType: "channel" | "group" | "direct" = "direct";
    if (parts.includes("group")) chatType = "group";
    if (parts.includes("channel")) chatType = "channel";
    return {
        normalizedKey: normalized,
        channel,
        chatType,
    };
}

function isScopeAllowed(scope: QmdScope | undefined, sessionKey?: string): boolean {
    if (!scope) return true;
    const parsed = parseSessionScope(sessionKey);
    const channel = parsed.channel;
    const chatType = parsed.chatType;
    const normalizedKey = parsed.normalizedKey ?? "";
    const rawKey = sessionKey?.trim().toLowerCase() ?? "";
    for (const rule of scope.rules ?? []) {
        if (!rule) continue;
        const match = rule.match ?? {};
        if (match.channel && match.channel !== channel) continue;
        if (match.chatType && match.chatType !== chatType) continue;
        const keyPrefix = match.keyPrefix?.trim().toLowerCase();
        const rawPrefix = match.rawKeyPrefix?.trim().toLowerCase();
        if (rawPrefix && !rawKey.startsWith(rawPrefix)) continue;
        if (keyPrefix && !normalizedKey.startsWith(keyPrefix)) continue;
        return rule.action === "allow";
    }
    return (scope.default ?? "allow") === "allow";
}

function sessionDbPath(): string {
    return process.env.DB_PATH || path.join(process.cwd(), "powerdirector.db");
}

function parseMessageContent(raw: string): string {
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed
                .map((part) => (part && typeof part === "object" && (part as any).type === "text" ? String((part as any).text || "") : ""))
                .join("\n")
                .trim();
        }
        if (typeof parsed === "string") return parsed;
    } catch {
        // no-op
    }
    return raw;
}

export class QmdBackend implements MemorySearchManager {
    private readonly agentId: string;
    private readonly qmd: ResolvedQmdConfig;
    private readonly workspaceDir: string;
    private readonly qmdDir: string;
    private readonly xdgConfigHome: string;
    private readonly xdgCacheHome: string;
    private readonly indexPath: string;
    private readonly env: NodeJS.ProcessEnv;
    private readonly qmdCommand: string;
    private readonly qmdCommandArgs: string[];
    private readonly sessionsDir: string;

    private updateTimer: NodeJS.Timeout | null = null;
    private embedTimer: NodeJS.Timeout | null = null;
    private debounceTimer: NodeJS.Timeout | null = null;
    private pendingUpdate: Promise<void> | null = null;
    private closed = false;
    private lastUpdateAt: number | null = null;
    private lastEmbedAt: number | null = null;
    private readonly sessionExports = new Map<string, SessionExportRecord>();

    constructor(params: {
        agentId: string;
        workspaceDir: string;
        config: ResolvedQmdConfig;
    }) {
        this.agentId = params.agentId;
        this.workspaceDir = params.workspaceDir;
        this.qmd = params.config;
        const parsedCommand = parseCommand(this.qmd.command);
        this.qmdCommand = parsedCommand.command;
        this.qmdCommandArgs = parsedCommand.args;

        const stateDir = path.join(((typeof ((typeof os.homedir === "function") ? os.homedir : (() => "")) === "function") ? ((typeof ((typeof os.homedir === "function") ? os.homedir : (() => "")) === "function") ? ((typeof os.homedir === "function") ? os.homedir : (() => ""))() : "") : ""), ".powerdirector");
        const agentStateDir = path.join(stateDir, "agents", this.agentId);
        this.qmdDir = path.join(agentStateDir, "qmd");

        this.xdgConfigHome = path.join(this.qmdDir, "xdg-config");
        this.xdgCacheHome = path.join(this.qmdDir, "xdg-cache");
        this.indexPath = path.join(this.xdgCacheHome, "qmd", "index.sqlite");
        this.sessionsDir = this.qmd.sessions.exportDir
            ? resolveUserPath(this.qmd.sessions.exportDir)
            : path.join(this.qmdDir, "sessions");

        this.env = {
            ...process.env,
            XDG_CONFIG_HOME: this.xdgConfigHome,
            XDG_CACHE_HOME: this.xdgCacheHome,
            NO_COLOR: "1",
        };
    }

    public async initialize(): Promise<void> {
        await fs.mkdir(this.xdgConfigHome, { recursive: true });
        await fs.mkdir(this.xdgCacheHome, { recursive: true });
        await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
        if (this.qmd.sessions.enabled) {
            await fs.mkdir(this.sessionsDir, { recursive: true });
            this.ensureSessionCollection();
        }

        await this.ensureCollections();

        if (this.qmd.update.onBoot) {
            if (this.qmd.update.waitForBootSync) {
                await this.runUpdate("boot");
            } else {
                void this.runUpdate("boot").catch((error) => {
                    console.warn(`[QmdBackend] boot update failed: ${String(error)}`);
                });
            }
        }

        if (this.qmd.update.intervalMs > 0) {
            this.updateTimer = setInterval(() => {
                void this.scheduleDebouncedUpdate("interval");
            }, this.qmd.update.intervalMs);
        }
        if (this.qmd.update.embedIntervalMs > 0) {
            this.embedTimer = setInterval(() => {
                void this.runEmbed("interval-embed").catch((error) => {
                    console.warn(`[QmdBackend] embed failed: ${String(error)}`);
                });
            }, this.qmd.update.embedIntervalMs);
        }
    }

    public async warmSession(): Promise<void> {
        // QMD has no per-session warm logic beyond optional transcript export.
        if (this.qmd.sessions.enabled) {
            await this.exportSessionsIfNeeded();
        }
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
        if (this.closed) return [];
        const trimmed = query.trim();
        if (!trimmed) return [];
        if (!isScopeAllowed(this.qmd.scope as QmdScope | undefined, opts?.sessionKey)) {
            return [];
        }

        if (this.qmd.sessions.enabled) {
            await this.exportSessionsIfNeeded();
        }

        const configuredLimit = this.qmd.limits.maxResults;
        const requestedLimit = Math.max(1, opts?.maxResults ?? configuredLimit);
        const limit = Math.min(configuredLimit, requestedLimit);

        const searchModes: Array<"query" | "search" | "vsearch"> =
            this.qmd.searchMode === "query"
                ? ["query"]
                : [this.qmd.searchMode, "query"];

        for (const mode of searchModes) {
            try {
                const args = [mode, trimmed, "--json", "-n", String(limit)];
                for (const collection of this.qmd.collections) {
                    args.push("-c", collection.name);
                }
                const result = await this.runQmd(args, { timeoutMs: this.qmd.limits.timeoutMs });
                const items = this.parseQmdItems(result.stdout);
                if (!items.length) return [];
                const maxSnippetChars = Math.max(1, this.qmd.limits.maxSnippetChars);
                const maxInjectedChars = Math.max(maxSnippetChars, this.qmd.limits.maxInjectedChars);
                const minScore = Math.max(0, Math.min(1, opts?.minScore ?? 0));
                let injected = 0;
                const out: MemorySearchResult[] = [];
                for (const item of items) {
                    const score = typeof item.score === "number" ? item.score : 0;
                    if (score < minScore) {
                        continue;
                    }
                    const pathValue = String(item.path || item.file || "").trim();
                    let snippet = String(item.snippet || item.text || "").trim();
                    if (snippet.length > maxSnippetChars) {
                        snippet = snippet.slice(0, maxSnippetChars);
                    }
                    if (!snippet) continue;
                    if (injected + snippet.length > maxInjectedChars) {
                        const remaining = maxInjectedChars - injected;
                        if (remaining <= 0) break;
                        snippet = snippet.slice(0, remaining);
                    }
                    injected += snippet.length;
                    out.push({
                        path: pathValue || "qmd",
                        startLine: Number(item.start_line ?? item.startLine ?? 0) || 0,
                        endLine: Number(item.end_line ?? item.endLine ?? 0) || 0,
                        score,
                        snippet,
                        source: this.resolveSource(pathValue),
                    });
                    if (out.length >= limit || injected >= maxInjectedChars) {
                        break;
                    }
                }
                return out;
            } catch (error: any) {
                const message = String(error?.message || error || "");
                if (mode !== "query" && /unknown command|invalid choice|not found/i.test(message)) {
                    continue;
                }
                console.warn(`[QmdBackend] search failed: ${message}`);
                return [];
            }
        }

        return [];
    }

    public async sync(params?: {
        reason?: string;
        force?: boolean;
        progress?: (update: MemorySyncProgressUpdate) => void;
    }): Promise<void> {
        if (this.closed) return;
        const reason = params?.reason || "manual";
        await this.scheduleDebouncedUpdate(reason, true, params?.progress);
    }

    public status(): MemoryProviderStatus {
        const sourceKinds = Array.from(new Set(this.qmd.collections.map((c) => c.kind === "sessions" ? "sessions" : "memory")));
        return {
            backend: "qmd",
            provider: "qmd",
            model: "qmd",
            requestedProvider: "qmd",
            files: 0,
            chunks: 0,
            dirty: Boolean(this.pendingUpdate),
            workspaceDir: this.workspaceDir,
            dbPath: this.indexPath,
            sources: sourceKinds,
            sourceCounts: [],
            vector: { enabled: true, available: true },
            batch: {
                enabled: false,
                failures: 0,
                limit: 0,
                wait: false,
                concurrency: 0,
                pollIntervalMs: 0,
                timeoutMs: 0,
            },
            custom: {
                command: this.qmd.command,
                commandResolved: this.qmdCommand,
                commandArgs: this.qmdCommandArgs,
                searchMode: this.qmd.searchMode,
                includeDefaultMemory: this.qmd.includeDefaultMemory,
                sessionsEnabled: this.qmd.sessions.enabled,
                lastUpdateAt: this.lastUpdateAt,
                lastEmbedAt: this.lastEmbedAt,
            },
        };
    }

    public async close(): Promise<void> {
        this.closed = true;
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        if (this.embedTimer) {
            clearInterval(this.embedTimer);
            this.embedTimer = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        if (this.pendingUpdate) {
            await this.pendingUpdate.catch(() => {});
            this.pendingUpdate = null;
        }
    }

    private ensureSessionCollection(): void {
        const hasCollection = this.qmd.collections.some((entry) => entry.kind === "sessions");
        if (hasCollection) return;
        this.qmd.collections.push({
            name: `${DEFAULT_SESSION_COLLECTION}-${this.agentId.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`,
            path: this.sessionsDir,
            pattern: "**/*.md",
            kind: "sessions",
        });
    }

    private async ensureCollections(): Promise<void> {
        for (const collection of this.qmd.collections) {
            try {
                if (collection.pattern.includes("*")) {
                    await fs.mkdir(collection.path, { recursive: true }).catch(() => {});
                }
                await this.runQmd(["collection", "add", collection.path, "--name", collection.name, "--mask", collection.pattern], {
                    timeoutMs: this.qmd.update.commandTimeoutMs,
                }).catch((error) => {
                    const msg = String((error as Error).message || "");
                    if (!/already exists|exists/i.test(msg)) {
                        throw error;
                    }
                });
            } catch (error: any) {
                console.warn(`[QmdBackend] failed to ensure collection ${collection.name}: ${String(error?.message || error)}`);
            }
        }
    }

    private parseQmdItems(stdout: string): any[] {
        try {
            const parsed = JSON.parse(stdout);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            const match = stdout.match(/\[[\s\S]*\]/);
            if (!match) return [];
            try {
                const parsed = JSON.parse(match[0]);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
    }

    private resolveSource(pathValue: string): MemorySource {
        const normalized = pathValue.toLowerCase();
        if (
            normalized.includes("/sessions/")
            || normalized.startsWith("sessions/")
            || normalized.includes("qmd://sessions-")
            || normalized.includes("/sessions-")
        ) {
            return "sessions";
        }
        return "memory";
    }

    private async scheduleDebouncedUpdate(
        reason: string,
        forceImmediate: boolean = false,
        progress?: (update: MemorySyncProgressUpdate) => void,
    ): Promise<void> {
        if (this.closed) return;
        if (forceImmediate || this.qmd.update.debounceMs <= 0) {
            await this.runUpdate(reason, false, progress);
            return;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        await new Promise<void>((resolve) => {
            this.debounceTimer = setTimeout(() => {
                this.debounceTimer = null;
                void this.runUpdate(reason, false, progress).finally(resolve);
            }, this.qmd.update.debounceMs);
        });
    }

    private async runUpdate(
        reason: string,
        bootRun: boolean = false,
        progress?: (update: MemorySyncProgressUpdate) => void,
    ): Promise<void> {
        if (this.closed) return;
        if (this.pendingUpdate) {
            await this.pendingUpdate;
            return;
        }
        progress?.({ completed: 0, total: 2, label: `qmd update (${reason})` });
        this.pendingUpdate = (async () => {
            if (this.qmd.sessions.enabled) {
                await this.exportSessionsIfNeeded();
            }
            await this.runQmd(["update"], { timeoutMs: this.qmd.update.updateTimeoutMs });
            this.lastUpdateAt = Date.now();
            progress?.({ completed: 1, total: 2, label: "qmd embed" });
            if (bootRun || this.qmd.update.embedIntervalMs <= 0) {
                await this.runEmbed(reason);
            }
            progress?.({ completed: 2, total: 2, label: "done" });
        })();

        try {
            await this.pendingUpdate;
        } finally {
            this.pendingUpdate = null;
        }
    }

    private async runEmbed(reason: string): Promise<void> {
        if (this.closed) return;
        await this.runQmd(["embed"], { timeoutMs: this.qmd.update.embedTimeoutMs });
        this.lastEmbedAt = Date.now();
        if (reason && process.env.NODE_ENV !== "production") {
            // no-op branch used for debug reason tracing
        }
    }

    private async exportSessionsIfNeeded(): Promise<void> {
        if (!this.qmd.sessions.enabled) return;
        const dbPath = sessionDbPath();
        if (!fsSync.existsSync(dbPath)) {
            return;
        }
        const retentionMs = this.qmd.sessions.retentionDays
            ? this.qmd.sessions.retentionDays * 24 * 60 * 60 * 1000
            : undefined;
        const now = Date.now();
        let db: Database.Database | null = null;
        try {
            db = new Database(dbPath, { readonly: true, fileMustExist: true });
            const sessions = db.prepare(
                "SELECT id, updated_at FROM sessions ORDER BY updated_at DESC LIMIT 400",
            ).all() as Array<{ id: string; updated_at: number }>;
            const msgRows = db.prepare(
                "SELECT session_id, role, content, timestamp FROM messages ORDER BY session_id ASC, timestamp ASC",
            ).all() as Array<{ session_id: string; role: string; content: string; timestamp: number }>;
            const grouped = new Map<string, Array<{ role: string; content: string; timestamp: number }>>();
            for (const row of msgRows) {
                const list = grouped.get(row.session_id) || [];
                list.push({
                    role: row.role,
                    content: parseMessageContent(row.content),
                    timestamp: row.timestamp,
                });
                grouped.set(row.session_id, list);
            }

            await fs.mkdir(this.sessionsDir, { recursive: true });

            for (const session of sessions) {
                if (retentionMs && now - (session.updated_at || 0) > retentionMs) {
                    continue;
                }
                const history = grouped.get(session.id) || [];
                if (history.length === 0) continue;
                const lines = history.map((entry) => {
                    const stamp = new Date(entry.timestamp || session.updated_at).toISOString();
                    return `## ${entry.role.toUpperCase()} ${stamp}\n${entry.content.trim()}`;
                });
                const doc = lines.join("\n\n").trim();
                if (!doc) continue;
                const hash = hashText(doc);
                const known = this.sessionExports.get(session.id);
                if (known && known.hash === hash) continue;
                const filePath = path.join(this.sessionsDir, `${session.id}.md`);
                await fs.writeFile(filePath, doc, "utf8");
                this.sessionExports.set(session.id, {
                    id: session.id,
                    hash,
                    updatedAt: session.updated_at,
                    filePath,
                });
            }

            if (retentionMs) {
                for (const [sessionId, record] of this.sessionExports) {
                    if (now - record.updatedAt <= retentionMs) continue;
                    try {
                        await fs.rm(record.filePath, { force: true });
                    } catch {
                        // ignore
                    }
                    this.sessionExports.delete(sessionId);
                }
            }
        } finally {
            db?.close();
        }
    }

    private async runQmd(
        args: string[],
        opts?: { timeoutMs?: number },
    ): Promise<{ stdout: string; stderr: string }> {
        return await new Promise((resolve, reject) => {
            const child = spawn(this.qmdCommand, [...this.qmdCommandArgs, ...args], {
                env: this.env,
                cwd: this.workspaceDir,
            });
            let stdout = "";
            let stderr = "";
            const timer = opts?.timeoutMs
                ? setTimeout(() => {
                    child.kill("SIGKILL");
                    reject(new Error(`qmd ${args.join(" ")} timed out after ${opts.timeoutMs}ms`));
                }, opts.timeoutMs)
                : null;
            child.stdout.on("data", (data) => {
                const next = appendOutputWithCap(stdout, data.toString("utf8"), MAX_QMD_OUTPUT_CHARS);
                stdout = next.text;
            });
            child.stderr.on("data", (data) => {
                const next = appendOutputWithCap(stderr, data.toString("utf8"), MAX_QMD_OUTPUT_CHARS);
                stderr = next.text;
            });
            child.on("error", (error) => {
                if (timer) clearTimeout(timer);
                reject(error);
            });
            child.on("close", (code) => {
                if (timer) clearTimeout(timer);
                if (code === 0) {
                    resolve({ stdout, stderr });
                    return;
                }
                reject(new Error(`qmd ${args.join(" ")} failed (code ${code}): ${stderr || stdout}`));
            });
        });
    }
}
