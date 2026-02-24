// @ts-nocheck
export enum ErrorCode {
    PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',
    PROVIDER_RATE_LIMIT = 'PROVIDER_RATE_LIMIT',
    PROVIDER_AUTH_ERROR = 'PROVIDER_AUTH_ERROR',
    PROVIDER_OVERLOADED = 'PROVIDER_OVERLOADED',
    CONTEXT_OVERFLOW = 'CONTEXT_OVERFLOW',
    NETWORK_ERROR = 'NETWORK_ERROR',
    CIRCUIT_OPEN = 'CIRCUIT_OPEN',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type RetryStrategy = 'IMMEDIATE' | 'EXPONENTIAL_BACKOFF' | 'NONE';

export class PowerDirectorError extends Error {
    public readonly code: ErrorCode;
    public readonly retryable: boolean;
    public readonly strategy: RetryStrategy;
    public readonly provider?: string;
    public readonly model?: string;

    constructor(
        message: string,
        code: ErrorCode,
        options?: {
            cause?: unknown;
            retryable?: boolean;
            strategy?: RetryStrategy;
            provider?: string;
            model?: string;
        }
    ) {
        super(message);
        this.name = 'PowerDirectorError';
        this.code = code;
        this.cause = options?.cause;
        this.retryable = options?.retryable ?? false;
        this.strategy = options?.strategy ?? 'NONE';
        this.provider = options?.provider;
        this.model = options?.model;
    }

    static from(error: unknown, provider?: string, model?: string): PowerDirectorError {
        if (error instanceof PowerDirectorError) {
            return error;
        }

        const msg = error instanceof Error ? error.message : String(error);

        // Naive heuristic for now - will be refined with specific provider SDK checks
        const lower = msg.toLowerCase();
        if (lower.includes('timeout') || lower.includes('timed out') || msg.includes('ETIMEDOUT')) {
            return new PowerDirectorError('Provider timed out', ErrorCode.PROVIDER_TIMEOUT, { cause: error, retryable: true, strategy: 'EXPONENTIAL_BACKOFF', provider, model });
        }
        if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('1302') || lower.includes('rate limit reached')) {
            return new PowerDirectorError('Rate limit exceeded', ErrorCode.PROVIDER_RATE_LIMIT, { cause: error, retryable: true, strategy: 'EXPONENTIAL_BACKOFF', provider, model });
        }

        return new PowerDirectorError(msg, ErrorCode.UNKNOWN_ERROR, { cause: error, provider, model });
    }
}
