function toTrimmedLower(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
}

export function hasExplicitDefaultModelSelection(provider: unknown, model: unknown): boolean {
    const providerId = toTrimmedLower(provider);
    const modelId = toTrimmedLower(model);

    return providerId === 'default'
        || modelId === 'default'
        || modelId === 'default/default';
}

export function shouldUseConfiguredDefaultChain(input: {
    provider?: unknown;
    model?: unknown;
    useDefaultModelChain?: unknown;
}): boolean {
    if (input.useDefaultModelChain === true) {
        return true;
    }

    return hasExplicitDefaultModelSelection(input.provider, input.model);
}
