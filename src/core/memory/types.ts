// @ts-nocheck
export type MemorySource = "memory" | "sessions" | "custom";

export type MemorySearchResult = {
    path: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
    source: MemorySource;
};

export type MemorySyncProgressUpdate = {
    completed: number;
    total: number;
    label?: string;
};

export type MemoryEmbeddingProbeResult = {
    ok: boolean;
    error?: string;
    provider?: string;
    model?: string;
};

export type MemoryProviderStatus = {
    backend: string;
    provider: string;
    model: string;
    requestedProvider: string;
    files: number;
    chunks: number;
    dirty: boolean;
    workspaceDir: string;
    dbPath: string;
    sources: string[];
    sourceCounts: Array<{ source: MemorySource; files: number; chunks: number }>;
    vector: { enabled: boolean; available: boolean | null; dims?: number; loadError?: string; extensionPath?: string };
    batch: {
        enabled: boolean;
        failures: number;
        limit: number;
        wait: boolean;
        concurrency: number;
        pollIntervalMs: number;
        timeoutMs: number;
    };
    custom?: Record<string, any>;
};

export interface MemorySearchManager {
    search(
        query: string,
        opts?: {
            maxResults?: number;
            minScore?: number;
            sessionKey?: string;
            channelId?: string;
            chatType?: "channel" | "group" | "direct";
        }
    ): Promise<MemorySearchResult[]>;

    sync(params?: {
        reason?: string;
        force?: boolean;
        progress?: (update: MemorySyncProgressUpdate) => void;
    }): Promise<void>;

    status(): MemoryProviderStatus;

    close(): Promise<void>;

    warmSession?(sessionKey?: string): Promise<void>;

    // Extras for PowerDirector legacy compat
    add?(text: string, metadata?: Record<string, any>): any;
    list?(limit?: number): any[];
    summarize?(limit?: number): string;
}
