// @ts-nocheck
import { CircuitBreaker } from './circuit-breaker.js';
import { PowerDirectorError, ErrorCode } from './errors.js';
import { ProviderConfig } from './types.js';

export interface Provider {
    config: ProviderConfig;
    circuit: CircuitBreaker;
    completion: (prompt: string, model?: string, options?: ProviderExecutionOptions) => Promise<string>;
    completionStream?: (prompt: string, model?: string, options?: ProviderExecutionOptions) => AsyncIterable<string>;
}

export interface ProviderExecutionOptions {
    attachments?: any[];
    reasoning?: 'low' | 'medium' | 'high' | 'xhigh';
    maxExecutionMs?: number;
    signal?: AbortSignal;
    tools?: any[];
    tool_choice?: any;
    /**
     * When an override provider/model is specified and fails, try these
     * provider/model IDs (e.g. "google-gemini-cli/gemini-3-pro-preview") in
     * order before falling back to all remaining providers.
     */
    fallbackChain?: string[];
    onFallback?: (metadata: ProviderExecutionMetadata) => void;
    onRetry?: (info: ProviderRetryInfo) => void;
}

export interface ProviderExecutionMetadata {
    provider: string;
    model?: string;
    requestedModelId?: string;
    requestedProvider?: string;
    requestedModel?: string;
    fallbackUsed: boolean;
    fallbackFromProvider?: string;
    fallbackFromModel?: string;
}

export interface ProviderExecutionResult {
    output: string;
    metadata: ProviderExecutionMetadata;
}

export interface ProviderRetryInfo {
    attempt: number;
    maxRetries: number;
    provider: string;
    model?: string;
    reason: string;
    delayMs: number;
}

export interface ProviderStreamResult {
    stream: AsyncIterable<string>;
    metadata: ProviderExecutionMetadata;
}

export interface ProviderCooldownConfig {
    billingBackoffHours?: number;
    billingBackoffHoursByProvider?: Record<string, number>;
    billingMaxHours?: number;
    failureWindowHours?: number;
}

export interface ProviderRouterOptions {
    cooldowns?: ProviderCooldownConfig;
    mode?: 'merge' | 'replace';
}

type ProviderFailureReason = 'billing' | 'rate_limit' | 'unknown';

type ProviderCooldownState = {
    windowStart: number;
    errorCount: number;
    billingCount: number;
    cooldownUntil: number;
    reason?: ProviderFailureReason;
};

type ResolvedCooldownConfig = {
    billingBackoffMs: number;
    billingBackoffHoursByProvider: Record<string, number>;
    billingMaxMs: number;
    failureWindowMs: number;
};

const DEFAULT_COOLDOWN_CONFIG: ResolvedCooldownConfig = {
    billingBackoffMs: 5 * 60 * 60 * 1000,
    billingBackoffHoursByProvider: {},
    billingMaxMs: 24 * 60 * 60 * 1000,
    failureWindowMs: 24 * 60 * 60 * 1000
};

export class ProviderRouter {
    private providers: Provider[] = [];
    private providerRateWindows: Map<string, { windowStart: number; count: number }> = new Map();
    private providerCooldowns: Map<string, ProviderCooldownState> = new Map();
    private readonly cooldownConfig: ResolvedCooldownConfig;
    private readonly mode: 'merge' | 'replace';

    /**
     * Best-effort abort signal for the currently in-flight provider call.
     */
    private abortController: AbortController | null = null;

    public abortActive(reason = 'aborted'): boolean {
        if (!this.abortController) return false;
        try {
            this.abortController.abort(new Error(reason));
            return true;
        } catch {
            return false;
        } finally {
            this.abortController = null;
        }
    }

    constructor(options: ProviderRouterOptions = {}) {
        this.cooldownConfig = this.resolveCooldownConfig(options.cooldowns);
        this.mode = options.mode || 'merge';
    }

    public clearProviders() {
        this.providers = [];
    }

    public addProvider(provider: Provider) {
        this.providers.push(provider);
    }

    public reorderProviders(preferredOrder: string[]) {
        if (!Array.isArray(preferredOrder) || preferredOrder.length === 0) return;
        const normalized = preferredOrder.map(p => p.trim().toLowerCase()).filter(Boolean);
        if (normalized.length === 0) return;

        const picked = new Set<number>();
        const reordered: Provider[] = [];

        for (const wanted of normalized) {
            for (let i = 0; i < this.providers.length; i++) {
                const provider = this.providers[i];
                if (picked.has(i)) continue;

                const pName = provider.config.name.toLowerCase();
                // Match "provider" exactly or if "wanted" is "provider/model"
                if (pName === wanted || wanted.startsWith(pName + '/')) {
                    reordered.push(provider);
                    picked.add(i);
                    break;
                }
            }
        }

        for (let i = 0; i < this.providers.length; i++) {
            if (!picked.has(i)) reordered.push(this.providers[i]);
        }

        this.providers = reordered;
    }

    public async execute(prompt: string, modelId?: string, options?: ProviderExecutionOptions): Promise<string> {
        const result = await this.executeDetailed(prompt, modelId, options);
        return result.output;
    }

    public async executeDetailed(
        prompt: string,
        modelId?: string,
        options?: ProviderExecutionOptions
    ): Promise<ProviderExecutionResult> {
        // Create a local abort controller for this specific execution to allow internal cancellation via abortActive().
        const executionAbortController = new AbortController();
        this.abortController = executionAbortController;

        // Link with options.signal if provided
        const linkedSignal = options?.signal
            ? (AbortSignal as any).any([options.signal, executionAbortController.signal])
            : executionAbortController.signal;

        const errors: PowerDirectorError[] = [];

        type ChainEntry = { provider: Provider; model?: string };
        let targetEntries: ChainEntry[];
        let preferredProviderName: string | undefined;
        let targetModel: string | undefined;
        const normalizedModelId = typeof modelId === 'string' ? modelId.trim() : '';

        // Strict chain enforcement: ONLY try the configured primary + fallbackChain.
        // No legacy fallthrough to unregistered/unconfigured providers.
        if (normalizedModelId && normalizedModelId.includes('/')) {
            const splitAt = normalizedModelId.indexOf('/');
            const providerName = normalizedModelId.slice(0, splitAt).trim();
            const modelName = normalizedModelId.slice(splitAt + 1).trim();
            preferredProviderName = providerName;
            targetModel = modelName || undefined;

            const primaryProvider = this.providers.find(
                p => p.config.name.toLowerCase() === providerName.toLowerCase()
            );

            if (primaryProvider) {
                const primary: ChainEntry = { provider: primaryProvider, model: modelName || undefined };

                if (options?.fallbackChain && options.fallbackChain.length > 0) {
                    // Parse the chain: primary first, then each fallback in order.
                    const seenKeys = new Set<string>();
                    seenKeys.add(`${primaryProvider.config.name.toLowerCase()}/${(modelName || '').toLowerCase()}`);

                    const chainEntries: ChainEntry[] = [];
                    for (const id of options.fallbackChain) {
                        const slash = id.indexOf('/');
                        const fpName = slash >= 0 ? id.slice(0, slash).trim() : id.trim();
                        const fpModel = slash >= 0 ? id.slice(slash + 1).trim() : undefined;
                        const fp = this.providers.find(p => p.config.name.toLowerCase() === fpName.toLowerCase());
                        if (!fp) continue;
                        const key = `${fp.config.name.toLowerCase()}/${(fpModel || '').toLowerCase()}`;
                        if (!seenKeys.has(key)) {
                            seenKeys.add(key);
                            chainEntries.push({ provider: fp, model: fpModel || undefined });
                        }
                    }
                    targetEntries = [primary, ...chainEntries];
                } else {
                    // No fallback chain: try ONLY the primary. No spray.
                    targetEntries = [primary];
                }
            } else {
                console.warn(`[Router] Requested provider ${providerName} not found. No fallback.`);
                targetEntries = [];
            }
        } else {
            // No provider/model hint at all. Use fallbackChain if provided, otherwise nothing.
            if (options?.fallbackChain && options.fallbackChain.length > 0) {
                const chainEntries: ChainEntry[] = [];
                const seenKeys = new Set<string>();
                for (const id of options.fallbackChain) {
                    const slash = id.indexOf('/');
                    const fpName = slash >= 0 ? id.slice(0, slash).trim() : id.trim();
                    const fpModel = slash >= 0 ? id.slice(slash + 1).trim() : undefined;
                    const fp = this.providers.find(p => p.config.name.toLowerCase() === fpName.toLowerCase());
                    if (!fp) continue;
                    const key = `${fp.config.name.toLowerCase()}/${(fpModel || '').toLowerCase()}`;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        chainEntries.push({ provider: fp, model: fpModel || undefined });
                    }
                }
                targetEntries = chainEntries;
            } else {
                // Absolute last resort: no hint, no chain. Try first registered provider only.
                targetEntries = this.providers.length > 0
                    ? [{ provider: this.providers[0], model: undefined }]
                    : [];
            }
        }

        let firstProviderName: string | undefined;
        let firstProviderModel: string | undefined;

        const startedAt = Date.now();
        const hardDeadline = typeof options?.maxExecutionMs === 'number' && Number.isFinite(options.maxExecutionMs) && options.maxExecutionMs > 0
            ? startedAt + Math.floor(options.maxExecutionMs)
            : null;

        for (const [index, entry] of targetEntries.entries()) {
            const { provider, model: entryModel } = entry;
            if (hardDeadline && Date.now() >= hardDeadline) {
                errors.push(new PowerDirectorError(
                    `Execution budget exhausted after ${Math.max(0, hardDeadline - startedAt)}ms before trying provider ${provider.config.name}`,
                    ErrorCode.PROVIDER_TIMEOUT,
                    {
                        provider: provider.config.name,
                        model: entryModel,
                        retryable: false,
                        strategy: 'NONE'
                    }
                ));
                break;
            }
            let effectiveModel = entry.model || undefined;
            const cooldownUntil = this.getProviderCooldownUntil(provider.config.name, effectiveModel);
            if (cooldownUntil && cooldownUntil > Date.now()) {
                const waitMs = cooldownUntil - Date.now();
                const waitMinutes = Math.max(1, Math.ceil(waitMs / 60000));
                errors.push(new PowerDirectorError(
                    `Provider ${provider.config.name} is in cooldown for ~${waitMinutes} more minute(s)`,
                    ErrorCode.PROVIDER_RATE_LIMIT,
                    {
                        provider: provider.config.name,
                        model: entryModel,
                        retryable: false,
                        strategy: 'NONE'
                    }
                ));
                continue;
            }

            try {
                effectiveModel = this.resolveEffectiveModel(provider, entryModel);
                if (index === 0) {
                    firstProviderName = provider.config.name;
                    firstProviderModel = effectiveModel;
                }
                console.log(`Trying provider: ${provider.config.name} ${effectiveModel ? `with model ${effectiveModel}` : ''}`);

                // Allow bypassing circuit breaker for fallback models on same provider
                const useCircuit = index === 0 || (index > 0 && entry.provider !== targetEntries[index - 1].provider);

                const output = useCircuit
                    ? await this.executeWithRetry(provider, prompt, entryModel, {
                        ...(options as any),
                        signal: linkedSignal
                    } as any, hardDeadline, startedAt)
                    : await this.withTimeout(
                        provider.completion(prompt, entryModel, {
                            ...options,
                            signal: linkedSignal
                        }),
                        Math.max(1, provider.config.timeoutMs || 30000),
                        `Provider ${provider.config.name} timed out after ${provider.config.timeoutMs}ms`,
                        linkedSignal
                    );

                this.clearProviderCooldown(provider.config.name, effectiveModel);
                const fallbackUsed = index > 0;
                this.abortController = null;
                const metadata: ProviderExecutionMetadata = {
                    provider: provider.config.name,
                    model: effectiveModel,
                    requestedModelId: normalizedModelId || undefined,
                    requestedProvider: preferredProviderName,
                    requestedModel: targetModel || entryModel,
                    fallbackUsed,
                    fallbackFromProvider: fallbackUsed ? firstProviderName : undefined,
                    fallbackFromModel: fallbackUsed ? firstProviderModel : undefined
                };

                if (fallbackUsed && options?.onFallback) {
                    options.onFallback(metadata);
                }

                return {
                    output,
                    metadata
                };
            } catch (error) {
                console.warn(`Provider ${provider.config.name}${entryModel ? ` (${entryModel})` : ''} failed:`, error);
                let pdError = PowerDirectorError.from(error, provider.config.name, effectiveModel);

                // If it's a CIRCUIT_OPEN error from the circuit breaker, it might not have the provider/model set.
                if (pdError.code === ErrorCode.CIRCUIT_OPEN) {
                    pdError = new PowerDirectorError(pdError.message, pdError.code, {
                        cause: pdError.cause,
                        retryable: pdError.retryable,
                        strategy: pdError.strategy,
                        provider: provider.config.name,
                        model: effectiveModel
                    });
                }

                errors.push(pdError);
                this.recordProviderFailure(provider.config.name, pdError, effectiveModel);
                // Continue to next entry
            }
        }

        this.abortController = null;

        throw new PowerDirectorError(
            this.formatAggregateErrorMessage(errors),
            ErrorCode.UNKNOWN_ERROR,
            {
                cause: errors,
                retryable: errors.some((e) => e.retryable),
                strategy: errors.some((e) => e.retryable) ? 'EXPONENTIAL_BACKOFF' : 'NONE'
            }
        );
    }

    public async executeStream(
        prompt: string,
        modelId?: string,
        options?: ProviderExecutionOptions
    ): Promise<ProviderStreamResult> {
        const executionAbortController = new AbortController();
        this.abortController = executionAbortController;

        const linkedSignal = options?.signal
            ? (AbortSignal as any).any([options.signal, executionAbortController.signal])
            : executionAbortController.signal;

        const errors: PowerDirectorError[] = [];
        const normalizedModelId = typeof modelId === 'string' ? modelId.trim() : '';

        // Build targetEntries: each entry is {provider, model?} so same-provider
        // different-model fallbacks (e.g. gemini-3-pro-preview → gemini-3-flash-preview)
        // work correctly.
        type ChainEntry = { provider: Provider; model?: string };
        let targetEntries: ChainEntry[];
        let preferredProviderName: string | undefined;

        // Strict chain enforcement: ONLY try the configured primary + fallbackChain.
        if (normalizedModelId && normalizedModelId.includes('/')) {
            const splitAt = normalizedModelId.indexOf('/');
            const providerName = normalizedModelId.slice(0, splitAt).trim();
            const modelName = normalizedModelId.slice(splitAt + 1).trim();
            preferredProviderName = providerName;

            const primaryProvider = this.providers.find(
                p => p.config.name.toLowerCase() === providerName.toLowerCase()
            );

            if (primaryProvider) {
                const primary: ChainEntry = { provider: primaryProvider, model: modelName || undefined };

                if (options?.fallbackChain && options.fallbackChain.length > 0) {
                    const seenKeys = new Set<string>();
                    seenKeys.add(`${primaryProvider.config.name.toLowerCase()}/${modelName.toLowerCase()}`);

                    const chainEntries: ChainEntry[] = [];
                    for (const id of options.fallbackChain) {
                        const slash = id.indexOf('/');
                        const fpName = slash >= 0 ? id.slice(0, slash).trim() : id.trim();
                        const fpModel = slash >= 0 ? id.slice(slash + 1).trim() : undefined;
                        const fp = this.providers.find(p => p.config.name.toLowerCase() === fpName.toLowerCase());
                        if (!fp) continue;
                        const key = `${fp.config.name.toLowerCase()}/${(fpModel || '').toLowerCase()}`;
                        if (!seenKeys.has(key)) {
                            seenKeys.add(key);
                            chainEntries.push({ provider: fp, model: fpModel || undefined });
                        }
                    }
                    targetEntries = [primary, ...chainEntries];
                } else {
                    // No fallback chain: try ONLY the primary. No spray.
                    targetEntries = [primary];
                }
            } else {
                console.warn(`[Router] Requested provider ${providerName} not found. No fallback.`);
                targetEntries = [];
            }
        } else {
            // No provider/model hint. Use fallbackChain if provided.
            if (options?.fallbackChain && options.fallbackChain.length > 0) {
                const chainEntries: ChainEntry[] = [];
                const seenKeys = new Set<string>();
                for (const id of options.fallbackChain) {
                    const slash = id.indexOf('/');
                    const fpName = slash >= 0 ? id.slice(0, slash).trim() : id.trim();
                    const fpModel = slash >= 0 ? id.slice(slash + 1).trim() : undefined;
                    const fp = this.providers.find(p => p.config.name.toLowerCase() === fpName.toLowerCase());
                    if (!fp) continue;
                    const key = `${fp.config.name.toLowerCase()}/${(fpModel || '').toLowerCase()}`;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        chainEntries.push({ provider: fp, model: fpModel || undefined });
                    }
                }
                targetEntries = chainEntries;
            } else {
                targetEntries = this.providers.length > 0
                    ? [{ provider: this.providers[0], model: undefined }]
                    : [];
            }
        }

        console.log(`[Router] executeStream targetEntries:`, targetEntries.map(e => `${e.provider.config.name}/${e.model || 'default'}`));

        let firstProviderName: string | undefined;
        let firstProviderModel: string | undefined;

        const startedAt = Date.now();
        const hardDeadline = typeof options?.maxExecutionMs === 'number' && Number.isFinite(options.maxExecutionMs) && options.maxExecutionMs > 0
            ? startedAt + Math.floor(options.maxExecutionMs)
            : null;

        for (const [index, entry] of targetEntries.entries()) {
            if (hardDeadline && Date.now() >= hardDeadline) break;
            const { provider, model: entryModel } = entry;
            const cooldownUntil = this.getProviderCooldownUntil(provider.config.name, entryModel);
            if (cooldownUntil && cooldownUntil > Date.now()) {
                console.log(`[Router] Skipping provider ${provider.config.name}/${entryModel || 'default'} (cooldown until ${new Date(cooldownUntil).toISOString()})`);
                const waitMs = cooldownUntil - Date.now();
                const waitMinutes = Math.max(1, Math.ceil(waitMs / 60000));
                errors.push(new PowerDirectorError(
                    `Provider ${provider.config.name} is in cooldown for ~${waitMinutes} more minute(s)`,
                    ErrorCode.PROVIDER_RATE_LIMIT,
                    {
                        provider: provider.config.name,
                        model: entryModel,
                        retryable: false,
                        strategy: 'NONE'
                    }
                ));
                continue;
            }

            let effectiveModel: string | undefined;
            try {
                // For each chain entry, use the entry's own model hint directly.
                effectiveModel = this.resolveEffectiveModel(provider, entryModel);

                if (index === 0) {
                    firstProviderName = provider.config.name;
                    firstProviderModel = effectiveModel;
                }

                console.log(`Trying streaming provider: ${provider.config.name}${entryModel ? ` with model ${entryModel}` : ''} (entry ${index + 1}/${targetEntries.length})`);

                let stream: AsyncIterable<string>;
                if (typeof provider.completionStream === 'function') {
                    // If this is a fallback model on the same provider, we might want to bypass the circuit breaker 
                    // to ensure we at least try the fallback.
                    const useCircuit = index === 0 || (index > 0 && entry.provider !== targetEntries[index - 1].provider);

                    const getRawStream = () => this.withTimeout(
                        Promise.resolve(provider.completionStream!(prompt, entryModel, {
                            ...options,
                            signal: linkedSignal
                        })),
                        Math.max(1, provider.config.timeoutMs || 300000),
                        `Provider ${provider.config.name} connection timed out`,
                        linkedSignal
                    );

                    const rawStream = useCircuit
                        ? await provider.circuit.execute(getRawStream)
                        : await getRawStream();

                    // Probe the first chunk to catch early errors (like 429) inside the fallback loop.
                    const it = rawStream[Symbol.asyncIterator]();

                    const getFirstChunk = () => this.withTimeout(
                        it.next(),
                        Math.max(90000, provider.config.timeoutMs || 300000),
                        `Provider ${provider.config.name} first chunk timed out`,
                        linkedSignal
                    );

                    const firstChunk = useCircuit
                        ? await provider.circuit.execute(getFirstChunk)
                        : await getFirstChunk();

                    if (firstChunk.done || (typeof firstChunk.value === 'string' && firstChunk.value.length === 0)) {
                        throw new Error(`Provider ${provider.config.name} returned an empty first chunk`);
                    } else {
                        const router = this;
                        stream = (async function* () {
                            yield firstChunk.value;
                            while (true) {
                                try {
                                    const chunk = await it.next();
                                    if (chunk.done) break;
                                    yield chunk.value;
                                } catch (err) {
                                    if (linkedSignal.aborted) throw err;
                                    const pdError = PowerDirectorError.from(
                                        err,
                                        provider.config.name,
                                        effectiveModel
                                    );
                                    router.recordProviderFailure(provider.config.name, pdError, effectiveModel);
                                    console.warn(`Stream interrupted for ${provider.config.name}:`, err);
                                    throw pdError;
                                }
                            }
                        })();
                    }
                } else {
                    const useCircuit = index === 0 || (index > 0 && entry.provider !== targetEntries[index - 1].provider);
                    const output = useCircuit
                        ? await this.executeWithRetry(provider, prompt, entryModel, {
                            ...options,
                            signal: linkedSignal
                        }, hardDeadline, startedAt)
                        : await provider.completion(prompt, entryModel, {
                            ...options,
                            signal: linkedSignal
                        });
                    stream = (async function* () { yield output; })();
                }

                this.clearProviderCooldown(provider.config.name, effectiveModel);
                const fallbackUsed = index > 0;

                const metadata: ProviderExecutionMetadata = {
                    provider: provider.config.name,
                    model: effectiveModel,
                    requestedModelId: normalizedModelId || undefined,
                    requestedProvider: preferredProviderName,
                    requestedModel: entryModel,
                    fallbackUsed,
                    fallbackFromProvider: fallbackUsed ? firstProviderName : undefined,
                    fallbackFromModel: fallbackUsed ? firstProviderModel : undefined
                };

                if (fallbackUsed && options?.onFallback) {
                    options.onFallback(metadata);
                }

                return {
                    stream,
                    metadata
                };
            } catch (error) {
                console.warn(`Streaming provider ${provider.config.name}${entryModel ? ` (${entryModel})` : ''} failed:`, error);
                let pdError = PowerDirectorError.from(error, provider.config.name, effectiveModel);

                // If it's a CIRCUIT_OPEN error from the circuit breaker, it might not have the provider/model set.
                if (pdError.code === ErrorCode.CIRCUIT_OPEN) {
                    pdError = new PowerDirectorError(pdError.message, pdError.code, {
                        cause: pdError.cause,
                        retryable: pdError.retryable,
                        strategy: pdError.strategy,
                        provider: provider.config.name,
                        model: effectiveModel
                    });
                }

                errors.push(pdError);
                this.recordProviderFailure(provider.config.name, pdError, effectiveModel);
            }
        }

        throw new PowerDirectorError(
            this.formatAggregateErrorMessage(errors),
            ErrorCode.UNKNOWN_ERROR,
            { cause: errors }
        );
    }

    private resolveModelForProvider(
        provider: Provider,
        normalizedModelId: string,
        preferredProviderName?: string,
        targetModel?: string
    ): string | undefined {
        if (!targetModel) return undefined;

        // Explicit provider/model hint: only apply model override to that provider.
        if (normalizedModelId.includes('/')) {
            if (!preferredProviderName) return undefined;
            if (provider.config.name.toLowerCase() !== preferredProviderName.toLowerCase()) {
                return undefined;
            }
            return targetModel;
        }

        // Model-only hint can be attempted across all providers.
        return targetModel;
    }

    private resolveEffectiveModel(provider: Provider, modelForProvider?: string): string | undefined {
        if (modelForProvider && modelForProvider.trim().length > 0) {
            return modelForProvider.trim();
        }

        const providerAny = provider as any;
        const candidateModels = [
            providerAny?.model,
            providerAny?.defaultModel,
            providerAny?.modelName,
            providerAny?.config?.defaultModel
        ];

        for (const candidate of candidateModels) {
            if (typeof candidate === 'string' && candidate.trim().length > 0) {
                return candidate.trim();
            }
        }

        return undefined;
    }

    private formatAggregateErrorMessage(errors: PowerDirectorError[]): string {
        if (errors.length === 0) {
            const keys = Array.from(this.providerCooldowns.keys());
            const cooling = keys.filter(k => (this.providerCooldowns.get(k)?.cooldownUntil || 0) > Date.now());
            if (cooling.length > 0) {
                return `All providers are currently in cooldown due to previous failures: ${cooling.join(', ')}. Please wait a moment.`;
            }
            return 'All providers failed (no providers are currently configured or available).';
        }

        const details = errors
            .map((err, index) => {
                const provider = err.provider || `provider-${index + 1}`;
                const modelStr = err.model ? ` (${err.model})` : '';
                const code = err.code ? `[${err.code}]` : '[UNKNOWN_ERROR]';
                const msg = (err.message || 'Unknown failure').replace(/\s+/g, ' ').trim();
                return `${provider}${modelStr} ${code}: ${msg}`;
            })
            .join(' | ');

        return `All providers failed. ${details}`;
    }

    private normalizeProviderName(value: string): string {
        return value.trim().toLowerCase();
    }

    private resolveCooldownConfig(raw?: ProviderCooldownConfig): ResolvedCooldownConfig {
        const resolveHours = (value: unknown, fallback: number): number => {
            if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
                return fallback;
            }
            return value;
        };

        const billingBackoffHours = resolveHours(
            raw?.billingBackoffHours,
            DEFAULT_COOLDOWN_CONFIG.billingBackoffMs / 3600000
        );
        const billingMaxHours = resolveHours(
            raw?.billingMaxHours,
            DEFAULT_COOLDOWN_CONFIG.billingMaxMs / 3600000
        );
        const failureWindowHours = resolveHours(
            raw?.failureWindowHours,
            DEFAULT_COOLDOWN_CONFIG.failureWindowMs / 3600000
        );
        const billingBackoffHoursByProvider: Record<string, number> = {};
        for (const [provider, hours] of Object.entries(raw?.billingBackoffHoursByProvider || {})) {
            if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) continue;
            const key = this.normalizeProviderName(provider);
            if (!key) continue;
            billingBackoffHoursByProvider[key] = hours;
        }

        return {
            billingBackoffMs: billingBackoffHours * 3600000,
            billingBackoffHoursByProvider,
            billingMaxMs: billingMaxHours * 3600000,
            failureWindowMs: failureWindowHours * 3600000
        };
    }

    private classifyFailureReason(error: PowerDirectorError): ProviderFailureReason {
        if (error.code === ErrorCode.PROVIDER_RATE_LIMIT) {
            return 'rate_limit';
        }

        if (error.code === ErrorCode.PROVIDER_TIMEOUT) {
            return 'timeout';
        }

        const lower = String(error.message || '').toLowerCase();
        if (
            lower.includes('billing') ||
            lower.includes('insufficient_quota') ||
            lower.includes('insufficient quota') ||
            lower.includes('quota') ||
            lower.includes('credit') ||
            lower.includes('balance') ||
            lower.includes('payment required') ||
            lower.includes('usage limit')
        ) {
            return 'billing';
        }
        return 'unknown';
    }

    private calculateUnknownCooldownMs(errorCount: number): number {
        const normalized = Math.max(1, errorCount);
        return Math.min(60 * 60 * 1000, 60 * 1000 * 5 ** Math.min(normalized - 1, 3));
    }

    private resolveBillingBackoffMs(providerName: string, billingCount: number): number {
        const providerKey = this.normalizeProviderName(providerName);
        const providerHours = this.cooldownConfig.billingBackoffHoursByProvider[providerKey];
        const baseMs = Math.max(
            60_000,
            (typeof providerHours === 'number' && Number.isFinite(providerHours) && providerHours > 0
                ? providerHours * 3600000
                : this.cooldownConfig.billingBackoffMs)
        );
        const maxMs = Math.max(baseMs, this.cooldownConfig.billingMaxMs);
        const exponent = Math.min(Math.max(1, billingCount) - 1, 10);
        return Math.min(maxMs, baseMs * 2 ** exponent);
    }

    private recordProviderFailure(providerName: string, error: PowerDirectorError, modelName?: string): void {
        const pKey = this.normalizeProviderName(providerName);
        const mKey = modelName ? this.normalizeProviderName(modelName) : '';
        const key = mKey ? `${pKey}/${mKey}` : pKey;

        // LAN/Local providers should not be put into cooldown as transient 
        // network/wake issues are common and they are "free" to retry.
        if (pKey.includes('ollama')) {
            console.log(`[Router] Skipping cooldown for provider: ${providerName}`);
            return;
        }

        const now = Date.now();
        const existing = this.providerCooldowns.get(key);
        const windowExpired = !existing || now - existing.windowStart > this.cooldownConfig.failureWindowMs;
        const state: ProviderCooldownState = windowExpired
            ? { windowStart: now, errorCount: 0, billingCount: 0, cooldownUntil: 0 }
            : { ...existing };
        const reason = this.classifyFailureReason(error);
        state.reason = reason;

        if (reason === 'billing') {
            state.billingCount += 1;
            const backoffMs = this.resolveBillingBackoffMs(providerName, state.billingCount);
            state.cooldownUntil = now + backoffMs;
        } else if (reason === 'timeout' && state.errorCount < 3) {
            // Short cooldown for transient timeouts to allow immediate retries
            state.errorCount += 1;
            state.cooldownUntil = now + 5000;
        } else {
            state.errorCount += 1;
            const backoffMs = this.calculateUnknownCooldownMs(state.errorCount);
            state.cooldownUntil = now + backoffMs;
        }

        this.providerCooldowns.set(key, state);
    }

    private clearProviderCooldown(providerName: string, modelName?: string): void {
        const pKey = this.normalizeProviderName(providerName);
        const mKey = modelName ? this.normalizeProviderName(modelName) : '';
        const key = mKey ? `${pKey}/${mKey}` : pKey;

        const existing = this.providerCooldowns.get(key);
        if (!existing) return;
        this.providerCooldowns.set(key, {
            ...existing,
            windowStart: Date.now(),
            errorCount: 0,
            billingCount: 0,
            cooldownUntil: 0,
            reason: undefined
        });
    }

    private getProviderCooldownUntil(providerName: string, modelName?: string): number {
        const pKey = this.normalizeProviderName(providerName);
        const mKey = modelName ? this.normalizeProviderName(modelName) : '';

        // 1. Check specific model cooldown first
        if (mKey) {
            const mUntil = this.getCooldownForKey(`${pKey}/${mKey}`);
            if (mUntil > 0) return mUntil;
        }

        // 2. Fall back to checking general provider cooldown
        return this.getCooldownForKey(pKey);
    }

    private getCooldownForKey(key: string): number {
        const state = this.providerCooldowns.get(key);
        if (!state) return 0;
        if (state.cooldownUntil <= Date.now()) {
            if (state.cooldownUntil > 0) {
                this.providerCooldowns.set(key, {
                    ...state,
                    cooldownUntil: 0
                });
            }
            return 0;
        }
        return state.cooldownUntil;
    }

    private async executeWithRetry(
        provider: Provider,
        prompt: string,
        model?: string,
        options?: ProviderExecutionOptions,
        hardDeadline?: number | null,
        startedAt?: number
    ): Promise<string> {
        let attempt = 0;
        const maxRetries = 2; // Default for now

        while (true) {
            attempt++;
            try {
                this.throwIfAborted(options?.signal);
                if (!this.consumeProviderRateLimit(provider)) {
                    throw new PowerDirectorError(
                        `Provider ${provider.config.name} rate limit reached for this minute`,
                        ErrorCode.PROVIDER_RATE_LIMIT,
                        {
                            provider: provider.config.name,
                            retryable: false,
                            strategy: 'NONE'
                        }
                    );
                }

                const providerTimeoutMs = Math.max(1, provider.config.timeoutMs || 30000);
                let timeoutMs = providerTimeoutMs;
                if (hardDeadline) {
                    const remainingMs = hardDeadline - Date.now();
                    if (remainingMs <= 0) {
                        throw new PowerDirectorError(
                            `Execution budget exhausted after ${Math.max(0, (startedAt ? Date.now() - startedAt : 0))}ms`,
                            ErrorCode.PROVIDER_TIMEOUT,
                            {
                                provider: provider.config.name,
                                retryable: false,
                                strategy: 'NONE'
                            }
                        );
                    }
                    timeoutMs = Math.max(1, Math.min(providerTimeoutMs, remainingMs));
                }
                return await provider.circuit.execute(() => this.withTimeout(
                    provider.completion(prompt, model, options),
                    timeoutMs,
                    `Provider ${provider.config.name} timed out after ${timeoutMs}ms`,
                    options?.signal
                ));
            } catch (error) {
                if (this.isAbortError(error) || options?.signal?.aborted) {
                    throw this.abortError(options?.signal);
                }
                const pdError = PowerDirectorError.from(error, provider.config.name, model);

                if (!pdError.retryable || attempt > maxRetries || pdError.code === ErrorCode.CIRCUIT_OPEN) {
                    throw pdError;
                }

                const delay = Math.pow(2, attempt) * 1000 + (Math.random() * 500); // Exponential + Jitter
                const reason = `${pdError.code}: ${String(pdError.message || 'unknown error').replace(/\s+/g, ' ').trim()}`;
                console.log(
                    `Retry ${attempt}/${maxRetries} for ${provider.config.name} in ${Math.round(delay)}ms (reason: ${reason})`
                );
                options?.onRetry?.({
                    attempt,
                    maxRetries,
                    provider: provider.config.name,
                    model,
                    reason,
                    delayMs: Math.round(delay),
                });
                await this.waitWithAbort(delay, options?.signal);
            }
        }
    }

    private consumeProviderRateLimit(provider: Provider): boolean {
        const limit = provider.config.rateLimitPerMinute;
        if (typeof limit !== 'number' || limit <= 0) return true;

        const providerKey = provider.config.name.toLowerCase();
        const now = Date.now();
        const minuteWindow = now - (now % 60000);
        const current = this.providerRateWindows.get(providerKey);

        if (!current || current.windowStart !== minuteWindow) {
            this.providerRateWindows.set(providerKey, { windowStart: minuteWindow, count: 1 });
            return true;
        }

        if (current.count >= limit) {
            return false;
        }

        current.count += 1;
        this.providerRateWindows.set(providerKey, current);
        return true;
    }

    private isAbortError(error: unknown): boolean {
        if (!error || typeof error !== 'object') return false;
        const name = (error as any).name;
        if (typeof name === 'string' && name.toLowerCase() === 'aborterror') return true;
        const message = (error as any).message;
        return typeof message === 'string' && message.toLowerCase().includes('abort');
    }

    private abortError(signal?: AbortSignal): Error {
        const reason = (signal as any)?.reason;
        if (reason instanceof Error) {
            if (!reason.name) reason.name = 'AbortError';
            return reason;
        }
        const err = new Error(typeof reason === 'string' && reason.trim().length > 0 ? reason : 'aborted');
        err.name = 'AbortError';
        return err;
    }

    private throwIfAborted(signal?: AbortSignal): void {
        if (signal?.aborted) {
            throw this.abortError(signal);
        }
    }

    private async waitWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
        if (!Number.isFinite(delayMs) || delayMs <= 0) return;
        this.throwIfAborted(signal);
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                signal?.removeEventListener?.('abort', onAbort as EventListener);
                resolve();
            }, delayMs);

            const onAbort = () => {
                clearTimeout(timer);
                signal?.removeEventListener?.('abort', onAbort as EventListener);
                reject(this.abortError(signal));
            };

            signal?.addEventListener?.('abort', onAbort as EventListener, { once: true });
        });
    }

    private async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        timeoutMessage: string,
        signal?: AbortSignal
    ): Promise<T> {
        let timeout: NodeJS.Timeout | null = null;
        let abortHandler: (() => void) | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        });

        const abortPromise = signal
            ? new Promise<never>((_, reject) => {
                if (signal.aborted) {
                    reject(this.abortError(signal));
                    return;
                }
                const onAbort = () => reject(this.abortError(signal));
                signal.addEventListener('abort', onAbort, { once: true });
                abortHandler = () => signal.removeEventListener('abort', onAbort);
            })
            : null;

        try {
            return await Promise.race(
                abortPromise
                    ? [promise, timeoutPromise, abortPromise]
                    : [promise, timeoutPromise]
            );
        } finally {
            if (timeout) clearTimeout(timeout);
            if (abortHandler) abortHandler();
        }
    }
}
