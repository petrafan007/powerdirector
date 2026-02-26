// @ts-nocheck
import path from "node:path";
import fsSync from "node:fs";
import {
    MemorySearchManager,
    MemorySearchResult,
    MemoryProviderStatus,
} from "./types.ts";
import {
    ResolvedMemoryBackendConfig,
    mergeMemorySearchConfig,
    resolveMemoryBackendConfig,
} from "./config.ts";
import { QmdBackend } from "./qmd.ts";
import { SqliteVecBackend } from "./sqlite-vec.ts";

type BackendEntry = {
    manager: MemorySearchManager;
    backend: "builtin" | "qmd";
    citations: "auto" | "on" | "off";
    fallback?: {
        from: "qmd";
        reason: string;
    };
};

function stableSerialize(value: unknown): string {
    return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((entry) => sortValue(entry));
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, val]) => [key, sortValue(val)]);
        return Object.fromEntries(entries);
    }
    return value;
}

export class MemoryManager {
    private readonly backends = new Map<string, BackendEntry>();
    private readonly backendKeyByAgent = new Map<string, string>();
    private readonly baseDir: string;
    private readonly config: any;

    constructor(config: any = {}, options: { baseDir?: string } = {}) {
        this.config = config || {};
        this.baseDir = options.baseDir || process.cwd();
    }

    public isEnabled(agentId?: string): boolean {
        const targetAgent = agentId || this.resolveDefaultAgentId();
        const defaults = this.config.agents?.defaults?.memorySearch;
        const overrides = this.config.agents?.list?.find((entry: any) => entry.id === targetAgent)?.memorySearch;
        const enabled = overrides?.enabled ?? defaults?.enabled ?? true;
        return Boolean(enabled);
    }

    public async search(
        agentId: string,
        query: string,
        opts?: {
            maxResults?: number;
            minScore?: number;
            sessionKey?: string;
            channelId?: string;
            chatType?: "channel" | "group" | "direct";
        },
    ): Promise<MemorySearchResult[]> {
        const entry = await this.getBackend(agentId);
        if (!entry) return [];
        if (typeof entry.manager.warmSession === "function") {
            await entry.manager.warmSession(opts?.sessionKey);
        }
        return await entry.manager.search(query, opts);
    }

    public formatSearchResults(agentId: string, results: MemorySearchResult[]): string {
        if (!results.length) return "";
        const citationsMode = this.getCitationsMode(agentId);
        const includeCitations = citationsMode === "on" || citationsMode === "auto";
        return results.map((result) => {
            const snippet = result.snippet.trim();
            if (!includeCitations) {
                return `- ${snippet}`;
            }
            const lineText = result.startLine > 0
                ? `#L${result.startLine}${result.endLine > result.startLine ? `-L${result.endLine}` : ""}`
                : "";
            const citation = `${result.path}${lineText ? lineText : ""}`;
            return `- ${snippet} [${citation}] (score: ${result.score.toFixed(2)})`;
        }).join("\n");
    }

    public getCitationsMode(agentId: string): "auto" | "on" | "off" {
        const resolved = resolveMemoryBackendConfig({
            cfg: this.config,
            agentId,
            workspaceDir: this.resolveWorkspaceDir(agentId),
        });
        return resolved.citations;
    }

    public add(text: string, metadata?: Record<string, any>): { id: string; text: string; createdAt: number } {
        const agentId = String(metadata?.agentId || this.resolveDefaultAgentId());
        const backend = this.backends.get(this.backendKeyByAgent.get(agentId) || "");
        if (backend?.manager.add) {
            return backend.manager.add(text, metadata);
        }
        const createdAt = Date.now();
        const id = `${createdAt}-${Math.random().toString(36).slice(2, 10)}`;
        const filePath = path.join(this.resolveWorkspaceDir(agentId), "MEMORY.md");
        fsSync.appendFileSync(filePath, `- ${new Date(createdAt).toISOString()}: ${text}\n`, "utf8");
        return { id, text, createdAt };
    }

    public list(limit = 20): any[] {
        const agentId = this.resolveDefaultAgentId();
        const backend = this.backends.get(this.backendKeyByAgent.get(agentId) || "");
        if (backend?.manager.list) {
            return backend.manager.list(limit);
        }
        const filePath = path.join(this.resolveWorkspaceDir(agentId), "MEMORY.md");
        if (!fsSync.existsSync(filePath)) return [];
        const raw = fsSync.readFileSync(filePath, "utf8");
        return raw.split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(-Math.max(1, limit))
            .reverse()
            .map((line, idx) => ({ id: `memory-${idx}`, text: line, createdAt: Date.now() }));
    }

    public summarize(limit = 20): string {
        const agentId = this.resolveDefaultAgentId();
        const backend = this.backends.get(this.backendKeyByAgent.get(agentId) || "");
        if (backend?.manager.summarize) {
            return backend.manager.summarize(limit);
        }
        return this.list(limit).map((entry) => entry.text).join("\n");
    }

    public getStatus(): any {
        const byAgent: Record<string, MemoryProviderStatus & { fallback?: { from: string; reason: string } }> = {};
        for (const [agentId, key] of this.backendKeyByAgent.entries()) {
            const entry = this.backends.get(key);
            if (!entry) continue;
            const status = entry.manager.status();
            if (entry.fallback) {
                byAgent[agentId] = {
                    ...status,
                    fallback: {
                        from: entry.fallback.from,
                        reason: entry.fallback.reason,
                    },
                };
            } else {
                byAgent[agentId] = status;
            }
        }
        return {
            enabled: true,
            backends: byAgent,
        };
    }

    public async stop(): Promise<void> {
        for (const backend of this.backends.values()) {
            await backend.manager.close();
        }
        this.backends.clear();
        this.backendKeyByAgent.clear();
    }

    private async getBackend(agentId: string): Promise<BackendEntry | null> {
        if (!this.isEnabled(agentId)) {
            return null;
        }
        const workspaceDir = this.resolveWorkspaceDir(agentId);
        const resolvedBackend = resolveMemoryBackendConfig({
            cfg: this.config,
            agentId,
            workspaceDir,
        });
        const defaults = this.config.agents?.defaults?.memorySearch;
        const overrides = this.config.agents?.list?.find((entry: any) => entry.id === agentId)?.memorySearch;
        const resolvedSearch = mergeMemorySearchConfig(defaults, overrides, agentId);

        const cacheKey = stableSerialize({
            agentId,
            workspaceDir,
            backend: resolvedBackend,
            search: resolvedSearch,
        });

        const existingKey = this.backendKeyByAgent.get(agentId);
        if (existingKey && existingKey !== cacheKey) {
            const existing = this.backends.get(existingKey);
            if (existing) {
                await existing.manager.close().catch(() => {});
                this.backends.delete(existingKey);
            }
            this.backendKeyByAgent.delete(agentId);
        }

        const cached = this.backends.get(cacheKey);
        if (cached) {
            this.backendKeyByAgent.set(agentId, cacheKey);
            return cached;
        }

        let next: BackendEntry;
        if (resolvedBackend.backend === "qmd" && resolvedBackend.qmd) {
            try {
                const qmd = new QmdBackend({
                    agentId,
                    workspaceDir,
                    config: resolvedBackend.qmd,
                });
                await qmd.initialize();
                next = {
                    manager: qmd,
                    backend: "qmd",
                    citations: resolvedBackend.citations,
                };
            } catch (error: any) {
                const fallback = new SqliteVecBackend(agentId, resolvedSearch, workspaceDir);
                await fallback.initialize();
                next = {
                    manager: fallback,
                    backend: "builtin",
                    citations: resolvedBackend.citations,
                    fallback: {
                        from: "qmd",
                        reason: String(error?.message || error || "qmd initialization failed"),
                    },
                };
            }
        } else {
            const builtin = new SqliteVecBackend(agentId, resolvedSearch, workspaceDir);
            await builtin.initialize();
            next = {
                manager: builtin,
                backend: "builtin",
                citations: resolvedBackend.citations,
            };
        }

        this.backends.set(cacheKey, next);
        this.backendKeyByAgent.set(agentId, cacheKey);
        return next;
    }

    private resolveWorkspaceDir(agentId: string): string {
        const list = Array.isArray(this.config.agents?.list) ? this.config.agents.list : [];
        const entry = list.find((item: any) => item.id === agentId);
        const raw = entry?.workspace || this.config.agents?.defaults?.workspace;
        if (typeof raw === "string" && raw.trim()) {
            return path.isAbsolute(raw) ? raw : path.resolve(this.baseDir, raw);
        }
        return this.baseDir;
    }

    private resolveDefaultAgentId(): string {
        const list = Array.isArray(this.config.agents?.list) ? this.config.agents.list : [];
        const flagged = list.find((entry: any) => entry?.default === true && typeof entry.id === "string");
        if (flagged?.id) return flagged.id;
        const first = list.find((entry: any) => typeof entry?.id === "string");
        return first?.id || "main";
    }
}
