// @ts-nocheck
export interface ProviderConfig {
    name: string;
    apiEndpoint: string;
    timeoutMs: number;
    rateLimitPerMinute?: number;
}

export interface ProviderStats {
    failureCount: number;
    lastFailureTime?: number;
    successCount: number;
    totalRequests: number;
}
