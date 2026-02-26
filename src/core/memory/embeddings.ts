// @ts-nocheck
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fsSync from "node:fs";
import crypto from "node:crypto";

export type EmbeddingProviderId = "openai" | "gemini" | "voyage" | "local";

export interface EmbeddingProvider {
    id: EmbeddingProviderId;
    model: string;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[], options?: { concurrency?: number }): Promise<number[][]>;
}

export type EmbeddingProviderSelection = {
    provider: EmbeddingProvider | null;
    requestedProvider: "openai" | "local" | "gemini" | "voyage" | "auto";
    actualProvider?: EmbeddingProviderId;
    fallbackFrom?: EmbeddingProviderId;
    fallbackReason?: string;
};

function sanitizeText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

function textToDeterministicVector(text: string, dims: number = 384): number[] {
    const normalized = sanitizeText(text);
    if (!normalized) {
        return new Array(dims).fill(0);
    }
    const digest = crypto.createHash("sha256").update(normalized).digest();
    const result = new Array<number>(dims);
    for (let i = 0; i < dims; i += 1) {
        const b = digest[i % digest.length] ?? 0;
        result[i] = (b / 127.5) - 1;
    }
    return result;
}

async function runWithConcurrency<T>(
    jobs: Array<() => Promise<T>>,
    concurrency: number,
): Promise<T[]> {
    if (jobs.length === 0) return [];
    const limit = Math.max(1, Math.min(concurrency, jobs.length));
    const results = new Array<T>(jobs.length);
    let index = 0;
    let firstError: unknown;
    const workers = Array.from({ length: limit }, async () => {
        while (true) {
            if (firstError) return;
            const current = index;
            index += 1;
            if (current >= jobs.length) return;
            try {
                results[current] = await jobs[current]();
            } catch (error) {
                firstError = error;
                return;
            }
        }
    });
    await Promise.allSettled(workers);
    if (firstError) throw firstError;
    return results;
}

function resolveApiKey(params: {
    explicit?: string;
    envKeys: string[];
}): string | undefined {
    if (params.explicit?.trim()) return params.explicit.trim();
    for (const key of params.envKeys) {
        const value = process.env[key];
        if (value?.trim()) return value.trim();
    }
    return undefined;
}

function createLocalProvider(modelPath?: string): EmbeddingProvider | null {
    if (modelPath) {
        try {
            if (!modelPath.startsWith("hf:") && !fsSync.existsSync(modelPath)) {
                return null;
            }
        } catch {
            return null;
        }
    }
    return {
        id: "local",
        model: modelPath?.trim() || "local-deterministic",
        embed: async (text: string) => textToDeterministicVector(text),
        embedBatch: async (texts: string[]) => texts.map((text) => textToDeterministicVector(text)),
    };
}

function createOpenAiProvider(params: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
    headers?: Record<string, string>;
}): EmbeddingProvider {
    const client = new OpenAI({
        apiKey: params.apiKey,
        baseURL: params.baseUrl,
        defaultHeaders: params.headers,
        timeout: 30_000,
    });
    const model = params.model || "text-embedding-3-small";
    return {
        id: "openai",
        model,
        embed: async (text: string) => {
            const res = await client.embeddings.create({
                model,
                input: sanitizeText(text),
            });
            return res.data[0]?.embedding ?? [];
        },
        embedBatch: async (texts: string[]) => {
            const res = await client.embeddings.create({
                model,
                input: texts.map((text) => sanitizeText(text)),
            });
            return res.data.map((entry) => entry.embedding);
        },
    };
}

function createGeminiProvider(params: {
    apiKey: string;
    model?: string;
}): EmbeddingProvider {
    const sdk = new GoogleGenerativeAI(params.apiKey);
    const modelName = params.model || "gemini-embedding-001";
    const model = sdk.getGenerativeModel({ model: modelName });
    return {
        id: "gemini",
        model: modelName,
        embed: async (text: string) => {
            const result = await model.embedContent(sanitizeText(text));
            return result.embedding.values;
        },
        embedBatch: async (texts: string[], options?: { concurrency?: number }) => {
            const jobs = texts.map((text) => async () => {
                const result = await model.embedContent(sanitizeText(text));
                return result.embedding.values;
            });
            return await runWithConcurrency(jobs, options?.concurrency ?? 2);
        },
    };
}

function createVoyageProvider(params: {
    apiKey: string;
    model?: string;
    baseUrl?: string;
}): EmbeddingProvider {
    const model = params.model || "voyage-4-large";
    const base = (params.baseUrl?.trim() || "https://api.voyageai.com/v1").replace(/\/+$/, "");
    const endpoint = `${base}/embeddings`;
    return {
        id: "voyage",
        model,
        embed: async (text: string) => {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${params.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    input: [sanitizeText(text)],
                }),
            });
            if (!response.ok) {
                throw new Error(`voyage embeddings failed (${response.status})`);
            }
            const data = await response.json() as any;
            const embedding = data?.data?.[0]?.embedding;
            return Array.isArray(embedding) ? embedding : [];
        },
        embedBatch: async (texts: string[]) => {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${params.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    input: texts.map((text) => sanitizeText(text)),
                }),
            });
            if (!response.ok) {
                throw new Error(`voyage embeddings failed (${response.status})`);
            }
            const data = await response.json() as any;
            const values = Array.isArray(data?.data) ? data.data : [];
            return values.map((entry: any) => (Array.isArray(entry?.embedding) ? entry.embedding : []));
        },
    };
}

export async function createEmbeddingProvider(config: {
    provider: "openai" | "local" | "gemini" | "voyage" | "auto";
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    headers?: Record<string, string>;
    fallback?: "openai" | "gemini" | "local" | "voyage" | "none";
    local?: { modelPath?: string; modelCacheDir?: string };
}): Promise<EmbeddingProviderSelection> {
    const requestedProvider = config.provider;
    const localProvider = createLocalProvider(config.local?.modelPath);

    const openaiKey = resolveApiKey({
        explicit: config.apiKey,
        envKeys: ["OPENAI_API_KEY"],
    });
    const geminiKey = resolveApiKey({
        explicit: config.apiKey,
        envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    });
    const voyageKey = resolveApiKey({
        explicit: config.apiKey,
        envKeys: ["VOYAGE_API_KEY"],
    });

    const tryProvider = (): EmbeddingProvider | null => {
        if (requestedProvider === "local") {
            return localProvider;
        }
        if (requestedProvider === "openai") {
            if (!openaiKey) return null;
            return createOpenAiProvider({
                apiKey: openaiKey,
                baseUrl: config.baseUrl,
                model: config.model,
                headers: config.headers,
            });
        }
        if (requestedProvider === "gemini") {
            if (!geminiKey) return null;
            return createGeminiProvider({
                apiKey: geminiKey,
                model: config.model,
            });
        }
        if (requestedProvider === "voyage") {
            if (!voyageKey) return null;
            return createVoyageProvider({
                apiKey: voyageKey,
                model: config.model,
                baseUrl: config.baseUrl,
            });
        }
        if (localProvider) {
            return localProvider;
        }
        if (openaiKey) {
            return createOpenAiProvider({
                apiKey: openaiKey,
                baseUrl: config.baseUrl,
                model: config.model,
                headers: config.headers,
            });
        }
        if (geminiKey) {
            return createGeminiProvider({
                apiKey: geminiKey,
                model: config.model,
            });
        }
        if (voyageKey) {
            return createVoyageProvider({
                apiKey: voyageKey,
                model: config.model,
                baseUrl: config.baseUrl,
            });
        }
        return null;
    };

    const primary = tryProvider();
    if (primary) {
        return {
            provider: primary,
            requestedProvider,
            actualProvider: primary.id,
        };
    }

    const fallback = config.fallback && config.fallback !== "none" ? config.fallback : undefined;
    if (!fallback) {
        return {
            provider: null,
            requestedProvider,
            fallbackReason: "No usable embedding provider was configured",
        };
    }

    const fallbackProvider = await createEmbeddingProvider({
        ...config,
        provider: fallback,
        fallback: "none",
    });
    if (fallbackProvider.provider) {
        return {
            provider: fallbackProvider.provider,
            requestedProvider,
            actualProvider: fallbackProvider.provider.id,
            fallbackFrom: requestedProvider === "auto" ? undefined : (requestedProvider as Exclude<typeof requestedProvider, "auto">),
            fallbackReason: `Primary provider "${requestedProvider}" unavailable; using fallback "${fallbackProvider.provider.id}"`,
        };
    }

    return {
        provider: null,
        requestedProvider,
        fallbackReason: `Neither provider "${requestedProvider}" nor fallback "${fallback}" is available`,
    };
}
