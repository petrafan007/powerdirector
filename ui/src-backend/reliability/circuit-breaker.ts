// @ts-nocheck
import { PowerDirectorError, ErrorCode } from './errors';

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

interface CircuitConfig {
    failureThreshold: number;
    resetTimeoutMs: number;
}

export class CircuitBreaker {
    public state: CircuitState = CircuitState.CLOSED;
    private failures: number = 0;
    private lastFailureTime: number = 0;
    private readonly config: CircuitConfig;

    constructor(config: CircuitConfig = { failureThreshold: 3, resetTimeoutMs: 10000 }) {
        this.config = config;
    }

    public async execute<T>(action: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            const now = Date.now();
            if (now - this.lastFailureTime > this.config.resetTimeoutMs) {
                this.state = CircuitState.HALF_OPEN;
            } else {
                throw new PowerDirectorError(
                    'Circuit breaker is OPEN',
                    ErrorCode.CIRCUIT_OPEN,
                    { retryable: false }
                );
            }
        }

        try {
            const result = await action();
            // Reset failure streak after any successful call.
            if (this.state === CircuitState.HALF_OPEN || this.failures > 0) {
                this.onSuccess();
            }
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failures = 0;
        this.state = CircuitState.CLOSED;
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.config.failureThreshold) {
            this.state = CircuitState.OPEN;
        }
    }
}
