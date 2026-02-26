// @ts-nocheck
import path from "node:path";
import os from "node:os";
import { resolveUserPath, clampNumber, clampInt } from "./utils.js";

// --- Types for Memory Search (Sqlite-Vec) ---

export type MemorySearchConfig = {
    enabled?: boolean;
    sources?: ("memory" | "sessions")[];
    extraPaths?: string[];
    experimental?: { sessionMemory?: boolean };
    provider?: "openai" | "local" | "gemini" | "voyage";
    remote?: {
        baseUrl?: string;
        apiKey?: string;
        headers?: Record<string, string>;
        batch?: {
            enabled?: boolean;
            wait?: boolean;
            concurrency?: number;
            pollIntervalMs?: number;
            timeoutMinutes?: number;
        };
    };
    fallback?: "openai" | "gemini" | "local" | "voyage" | "none";
    model?: string;
    local?: { modelPath?: string; modelCacheDir?: string };
    store?: {
        driver?: "sqlite";
        path?: string;
        vector?: { enabled?: boolean; extensionPath?: string };
    };
    chunking?: { tokens?: number; overlap?: number };
    sync?: {
        onSessionStart?: boolean;
        onSearch?: boolean;
        watch?: boolean;
        watchDebounceMs?: number;
        intervalMinutes?: number;
        sessions?: { deltaBytes?: number; deltaMessages?: number };
    };
    query?: {
        maxResults?: number;
        minScore?: number;
        hybrid?: {
            enabled?: boolean;
            vectorWeight?: number;
            textWeight?: number;
            candidateMultiplier?: number;
        };
    };
    cache?: { enabled?: boolean; maxEntries?: number };
};

export type ResolvedMemorySearchConfig = {
    enabled: boolean;
    sources: Array<"memory" | "sessions">;
    extraPaths: string[];
    provider: "openai" | "local" | "gemini" | "voyage" | "auto";
    remote?: {
        baseUrl?: string;
        apiKey?: string;
        headers?: Record<string, string>;
        batch?: {
            enabled: boolean;
            wait: boolean;
            concurrency: number;
            pollIntervalMs: number;
            timeoutMinutes: number;
        };
    };
    experimental: { sessionMemory: boolean };
    fallback: "openai" | "gemini" | "local" | "voyage" | "none";
    model: string;
    local: { modelPath?: string; modelCacheDir?: string };
    store: {
        driver: "sqlite";
        path: string;
        vector: { enabled: boolean; extensionPath?: string };
    };
    chunking: { tokens: number; overlap: number };
    sync: {
        onSessionStart: boolean;
        onSearch: boolean;
        watch: boolean;
        watchDebounceMs: number;
        intervalMinutes: number;
        sessions: { deltaBytes: number; deltaMessages: number };
    };
    query: {
        maxResults: number;
        minScore: number;
        hybrid: {
            enabled: boolean;
            vectorWeight: number;
            textWeight: number;
            candidateMultiplier: number;
        };
    };
    cache: { enabled: boolean; maxEntries?: number };
};

const DEFAULT_OPENAI_MODEL = "text-embedding-3-small";
const DEFAULT_GEMINI_MODEL = "gemini-embedding-001";
const DEFAULT_VOYAGE_MODEL = "voyage-4-large";
const DEFAULT_CHUNK_TOKENS = 400;
const DEFAULT_CHUNK_OVERLAP = 80;
const DEFAULT_WATCH_DEBOUNCE_MS = 1500;
const DEFAULT_SESSION_DELTA_BYTES = 100_000;
const DEFAULT_SESSION_DELTA_MESSAGES = 50;
const DEFAULT_MAX_RESULTS = 6;
const DEFAULT_MIN_SCORE = 0.35;
const DEFAULT_HYBRID_ENABLED = true;
const DEFAULT_HYBRID_VECTOR_WEIGHT = 0.7;
const DEFAULT_HYBRID_TEXT_WEIGHT = 0.3;
const DEFAULT_HYBRID_CANDIDATE_MULTIPLIER = 4;
const DEFAULT_CACHE_ENABLED = true;
const DEFAULT_SOURCES: Array<"memory" | "sessions"> = ["memory"];

function normalizeSources(
    sources: Array<"memory" | "sessions"> | undefined,
    sessionMemoryEnabled: boolean,
): Array<"memory" | "sessions"> {
    const normalized = new Set<"memory" | "sessions">();
    const input = sources?.length ? sources : DEFAULT_SOURCES;
    for (const source of input) {
        if (source === "memory") {
            normalized.add("memory");
        }
        if (source === "sessions" && sessionMemoryEnabled) {
            normalized.add("sessions");
        }
    }
    if (normalized.size === 0) {
        normalized.add("memory");
    }
    return Array.from(normalized);
}

function resolveStorePath(agentId: string, raw?: string): string {
    const fallback = path.join(os.homedir(), ".powerdirector", "memory", `${agentId}.sqlite`);
    if (!raw) {
        return fallback;
    }
    const withToken = raw.includes("{agentId}") ? raw.replaceAll("{agentId}", agentId) : raw;
    return resolveUserPath(withToken);
}

export function mergeMemorySearchConfig(
    defaults: MemorySearchConfig | undefined,
    overrides: MemorySearchConfig | undefined,
    agentId: string,
): ResolvedMemorySearchConfig {
    const enabled = overrides?.enabled ?? defaults?.enabled ?? true;
    const sessionMemory =
        overrides?.experimental?.sessionMemory ?? defaults?.experimental?.sessionMemory ?? false;
    const provider = overrides?.provider ?? defaults?.provider ?? "auto";
    const defaultRemote = defaults?.remote;
    const overrideRemote = overrides?.remote;
    const hasRemoteConfig = Boolean(
        overrideRemote?.baseUrl ||
        overrideRemote?.apiKey ||
        overrideRemote?.headers ||
        defaultRemote?.baseUrl ||
        defaultRemote?.apiKey ||
        defaultRemote?.headers,
    );
    const includeRemote =
        hasRemoteConfig ||
        provider === "openai" ||
        provider === "gemini" ||
        provider === "voyage" ||
        provider === "auto";
    const batch = {
        enabled: overrideRemote?.batch?.enabled ?? defaultRemote?.batch?.enabled ?? false,
        wait: overrideRemote?.batch?.wait ?? defaultRemote?.batch?.wait ?? true,
        concurrency: Math.max(
            1,
            overrideRemote?.batch?.concurrency ?? defaultRemote?.batch?.concurrency ?? 2,
        ),
        pollIntervalMs:
            overrideRemote?.batch?.pollIntervalMs ?? defaultRemote?.batch?.pollIntervalMs ?? 2000,
        timeoutMinutes:
            overrideRemote?.batch?.timeoutMinutes ?? defaultRemote?.batch?.timeoutMinutes ?? 60,
    };
    const remote = includeRemote
        ? {
            baseUrl: overrideRemote?.baseUrl ?? defaultRemote?.baseUrl,
            apiKey: overrideRemote?.apiKey ?? defaultRemote?.apiKey,
            headers: overrideRemote?.headers ?? defaultRemote?.headers,
            batch,
        }
        : undefined;
    const fallback = overrides?.fallback ?? defaults?.fallback ?? "none";
    const modelDefault =
        provider === "gemini"
            ? DEFAULT_GEMINI_MODEL
            : provider === "openai"
                ? DEFAULT_OPENAI_MODEL
                : provider === "voyage"
                    ? DEFAULT_VOYAGE_MODEL
                    : undefined;
    const model = overrides?.model ?? defaults?.model ?? modelDefault ?? "";
    const local = {
        modelPath: overrides?.local?.modelPath ?? defaults?.local?.modelPath,
        modelCacheDir: overrides?.local?.modelCacheDir ?? defaults?.local?.modelCacheDir,
    };
    const sources = normalizeSources(overrides?.sources ?? defaults?.sources, sessionMemory);
    const rawPaths = [...(defaults?.extraPaths ?? []), ...(overrides?.extraPaths ?? [])]
        .map((value) => value.trim())
        .filter(Boolean);
    const extraPaths = Array.from(new Set(rawPaths));
    const vector = {
        enabled: overrides?.store?.vector?.enabled ?? defaults?.store?.vector?.enabled ?? true,
        extensionPath:
            overrides?.store?.vector?.extensionPath ?? defaults?.store?.vector?.extensionPath,
    };
    const store = {
        driver: overrides?.store?.driver ?? defaults?.store?.driver ?? "sqlite",
        path: resolveStorePath(agentId, overrides?.store?.path ?? defaults?.store?.path),
        vector,
    };
    const chunking = {
        tokens: overrides?.chunking?.tokens ?? defaults?.chunking?.tokens ?? DEFAULT_CHUNK_TOKENS,
        overlap: overrides?.chunking?.overlap ?? defaults?.chunking?.overlap ?? DEFAULT_CHUNK_OVERLAP,
    };
    const sync = {
        onSessionStart: overrides?.sync?.onSessionStart ?? defaults?.sync?.onSessionStart ?? true,
        onSearch: overrides?.sync?.onSearch ?? defaults?.sync?.onSearch ?? true,
        watch: overrides?.sync?.watch ?? defaults?.sync?.watch ?? true,
        watchDebounceMs:
            overrides?.sync?.watchDebounceMs ??
            defaults?.sync?.watchDebounceMs ??
            DEFAULT_WATCH_DEBOUNCE_MS,
        intervalMinutes: overrides?.sync?.intervalMinutes ?? defaults?.sync?.intervalMinutes ?? 0,
        sessions: {
            deltaBytes:
                overrides?.sync?.sessions?.deltaBytes ??
                defaults?.sync?.sessions?.deltaBytes ??
                DEFAULT_SESSION_DELTA_BYTES,
            deltaMessages:
                overrides?.sync?.sessions?.deltaMessages ??
                defaults?.sync?.sessions?.deltaMessages ??
                DEFAULT_SESSION_DELTA_MESSAGES,
        },
    };
    const query = {
        maxResults: overrides?.query?.maxResults ?? defaults?.query?.maxResults ?? DEFAULT_MAX_RESULTS,
        minScore: overrides?.query?.minScore ?? defaults?.query?.minScore ?? DEFAULT_MIN_SCORE,
    };
    const hybrid = {
        enabled:
            overrides?.query?.hybrid?.enabled ??
            defaults?.query?.hybrid?.enabled ??
            DEFAULT_HYBRID_ENABLED,
        vectorWeight:
            overrides?.query?.hybrid?.vectorWeight ??
            defaults?.query?.hybrid?.vectorWeight ??
            DEFAULT_HYBRID_VECTOR_WEIGHT,
        textWeight:
            overrides?.query?.hybrid?.textWeight ??
            defaults?.query?.hybrid?.textWeight ??
            DEFAULT_HYBRID_TEXT_WEIGHT,
        candidateMultiplier:
            overrides?.query?.hybrid?.candidateMultiplier ??
            defaults?.query?.hybrid?.candidateMultiplier ??
            DEFAULT_HYBRID_CANDIDATE_MULTIPLIER,
    };
    const cache = {
        enabled: overrides?.cache?.enabled ?? defaults?.cache?.enabled ?? DEFAULT_CACHE_ENABLED,
        maxEntries: overrides?.cache?.maxEntries ?? defaults?.cache?.maxEntries,
    };

    const overlap = clampNumber(chunking.overlap, 0, Math.max(0, chunking.tokens - 1));
    const minScore = clampNumber(query.minScore, 0, 1);
    const vectorWeight = clampNumber(hybrid.vectorWeight, 0, 1);
    const textWeight = clampNumber(hybrid.textWeight, 0, 1);
    const sum = vectorWeight + textWeight;
    const normalizedVectorWeight = sum > 0 ? vectorWeight / sum : DEFAULT_HYBRID_VECTOR_WEIGHT;
    const normalizedTextWeight = sum > 0 ? textWeight / sum : DEFAULT_HYBRID_TEXT_WEIGHT;
    const candidateMultiplier = clampInt(hybrid.candidateMultiplier, 1, 20);
    const deltaBytes = clampInt(sync.sessions.deltaBytes, 0, Number.MAX_SAFE_INTEGER);
    const deltaMessages = clampInt(sync.sessions.deltaMessages, 0, Number.MAX_SAFE_INTEGER);
    return {
        enabled,
        sources,
        extraPaths,
        provider,
        remote,
        experimental: {
            sessionMemory,
        },
        fallback,
        model,
        local,
        store,
        chunking: { tokens: Math.max(1, chunking.tokens), overlap },
        sync: {
            ...sync,
            sessions: {
                deltaBytes,
                deltaMessages,
            },
        },
        query: {
            ...query,
            minScore,
            hybrid: {
                enabled: Boolean(hybrid.enabled),
                vectorWeight: normalizedVectorWeight,
                textWeight: normalizedTextWeight,
                candidateMultiplier,
            },
        },
        cache: {
            enabled: Boolean(cache.enabled),
            maxEntries:
                typeof cache.maxEntries === "number" && Number.isFinite(cache.maxEntries)
                    ? Math.max(1, Math.floor(cache.maxEntries))
                    : undefined,
        },
    };
}

// --- Types for QMD ---

export type ResolvedQmdCollection = {
    name: string;
    path: string;
    pattern: string;
    kind: "memory" | "custom" | "sessions";
};

export type ResolvedQmdUpdateConfig = {
    intervalMs: number;
    debounceMs: number;
    onBoot: boolean;
    waitForBootSync: boolean;
    embedIntervalMs: number;
    commandTimeoutMs: number;
    updateTimeoutMs: number;
    embedTimeoutMs: number;
};

export type ResolvedQmdLimitsConfig = {
    maxResults: number;
    maxSnippetChars: number;
    maxInjectedChars: number;
    timeoutMs: number;
};

export type ResolvedQmdSessionConfig = {
    enabled: boolean;
    exportDir?: string;
    retentionDays?: number;
};

export type ResolvedQmdConfig = {
    command: string;
    searchMode: "query" | "search" | "vsearch";
    collections: ResolvedQmdCollection[];
    sessions: ResolvedQmdSessionConfig;
    update: ResolvedQmdUpdateConfig;
    limits: ResolvedQmdLimitsConfig;
    includeDefaultMemory: boolean;
    scope?: any; // Simplify scope type for now
};

export type ResolvedMemoryBackendConfig = {
    backend: "builtin" | "qmd";
    citations: "auto" | "on" | "off";
    qmd?: ResolvedQmdConfig;
};

// ... QMD defaults ...
const DEFAULT_QMD_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_QMD_DEBOUNCE_MS = 15_000;
const DEFAULT_QMD_TIMEOUT_MS = 4_000;
const DEFAULT_QMD_SEARCH_MODE = "search";
const DEFAULT_QMD_EMBED_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_QMD_COMMAND_TIMEOUT_MS = 30_000;
const DEFAULT_QMD_UPDATE_TIMEOUT_MS = 120_000;
const DEFAULT_QMD_EMBED_TIMEOUT_MS = 120_000;
const DEFAULT_QMD_LIMITS: ResolvedQmdLimitsConfig = {
    maxResults: 6,
    maxSnippetChars: 700,
    maxInjectedChars: 4_000,
    timeoutMs: DEFAULT_QMD_TIMEOUT_MS,
};

function sanitizeName(input: string): string {
    const lower = input.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const trimmed = lower.replace(/^-+|-+$/g, "");
    return trimmed || "collection";
}

function scopeCollectionBase(base: string, agentId: string): string {
    return `${base}-${sanitizeName(agentId)}`;
}

function ensureUniqueName(base: string, existing: Set<string>): string {
    let name = sanitizeName(base);
    if (!existing.has(name)) {
        existing.add(name);
        return name;
    }
    let suffix = 2;
    while (existing.has(`${name}-${suffix}`)) {
        suffix += 1;
    }
    const unique = `${name}-${suffix}`;
    existing.add(unique);
    return unique;
}

function resolvePath(raw: string, workspaceDir: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
        throw new Error("path required");
    }
    if (trimmed.startsWith("~") || path.isAbsolute(trimmed)) {
        return path.normalize(resolveUserPath(trimmed));
    }
    return path.normalize(path.resolve(workspaceDir, trimmed));
}

// Simple parser for 5m, 1h etc
function parseDuration(val: string | undefined, def: number): number {
    if (!val) return def;
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d+)([smh])$/);
    if (!match) return def;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 's') return num * 1000;
    if (unit === 'm') return num * 60 * 1000;
    if (unit === 'h') return num * 60 * 60 * 1000;
    return def;
}

export function resolveMemoryBackendConfig(params: {
    cfg: any; // Full config object
    agentId: string;
    workspaceDir: string;
}): ResolvedMemoryBackendConfig {
    const backend = params.cfg.memory?.backend === 'qmd' ? 'qmd' : 'builtin';
    const citations = params.cfg.memory?.citations === 'on' || params.cfg.memory?.citations === 'off' ? params.cfg.memory.citations : 'auto';

    if (backend !== 'qmd') {
        return { backend: 'builtin', citations };
    }

    const qmdCfg = params.cfg.memory?.qmd || {};
    const includeDefaultMemory = qmdCfg.includeDefaultMemory !== false;
    const nameSet = new Set<string>();
    
    // Resolve collections
    const collections: ResolvedQmdCollection[] = [];
    if (includeDefaultMemory) {
        const entries = [
            { path: params.workspaceDir, pattern: "MEMORY.md", base: "memory-root" },
            { path: params.workspaceDir, pattern: "memory.md", base: "memory-alt" },
            { path: path.join(params.workspaceDir, "memory"), pattern: "**/*.md", base: "memory-dir" },
        ];
        entries.forEach(e => {
            collections.push({
                name: ensureUniqueName(scopeCollectionBase(e.base, params.agentId), nameSet),
                path: e.path,
                pattern: e.pattern,
                kind: "memory"
            });
        });
    }
    
    if (Array.isArray(qmdCfg.paths)) {
        qmdCfg.paths.forEach((entry: any, index: number) => {
            if (!entry?.path?.trim()) return;
            try {
                const resolved = resolvePath(entry.path, params.workspaceDir);
                const pattern = entry.pattern?.trim() || "**/*.md";
                const baseName = scopeCollectionBase(entry.name?.trim() || `custom-${index + 1}`, params.agentId);
                collections.push({
                    name: ensureUniqueName(baseName, nameSet),
                    path: resolved,
                    pattern,
                    kind: "custom"
                });
            } catch {}
        });
    }

    const limits = qmdCfg.limits || {};
    const resolvedLimits: ResolvedQmdLimitsConfig = {
        maxResults: limits.maxResults > 0 ? limits.maxResults : DEFAULT_QMD_LIMITS.maxResults,
        maxSnippetChars: limits.maxSnippetChars > 0 ? limits.maxSnippetChars : DEFAULT_QMD_LIMITS.maxSnippetChars,
        maxInjectedChars: limits.maxInjectedChars > 0 ? limits.maxInjectedChars : DEFAULT_QMD_LIMITS.maxInjectedChars,
        timeoutMs: limits.timeoutMs > 0 ? limits.timeoutMs : DEFAULT_QMD_LIMITS.timeoutMs,
    };

    const update = qmdCfg.update || {};
    const resolvedUpdate: ResolvedQmdUpdateConfig = {
        intervalMs: parseDuration(update.interval, DEFAULT_QMD_INTERVAL_MS),
        debounceMs: update.debounceMs ?? DEFAULT_QMD_DEBOUNCE_MS,
        onBoot: update.onBoot !== false,
        waitForBootSync: update.waitForBootSync === true,
        embedIntervalMs: parseDuration(update.embedInterval, DEFAULT_QMD_EMBED_INTERVAL_MS),
        commandTimeoutMs: update.commandTimeoutMs ?? DEFAULT_QMD_COMMAND_TIMEOUT_MS,
        updateTimeoutMs: update.updateTimeoutMs ?? DEFAULT_QMD_UPDATE_TIMEOUT_MS,
        embedTimeoutMs: update.embedTimeoutMs ?? DEFAULT_QMD_EMBED_TIMEOUT_MS,
    };

    const sessions = qmdCfg.sessions || {};
    const resolvedSessions: ResolvedQmdSessionConfig = {
        enabled: Boolean(sessions.enabled),
        exportDir: sessions.exportDir ? resolvePath(sessions.exportDir, params.workspaceDir) : undefined,
        retentionDays: sessions.retentionDays
    };

    return {
        backend: 'qmd',
        citations,
        qmd: {
            command: qmdCfg.command?.trim() || 'qmd',
            searchMode: (['query', 'search', 'vsearch'].includes(qmdCfg.searchMode) ? qmdCfg.searchMode : DEFAULT_QMD_SEARCH_MODE) as any,
            collections,
            sessions: resolvedSessions,
            update: resolvedUpdate,
            limits: resolvedLimits,
            includeDefaultMemory,
            scope: qmdCfg.scope
        }
    };
}
