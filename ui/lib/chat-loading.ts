export interface ChatMessageLike {
    role?: string;
    content?: unknown;
    metadata?: {
        callId?: unknown;
        tool?: unknown;
        type?: unknown;
        status?: unknown;
        final?: unknown;
        limitReached?: unknown;
        aborted?: unknown;
    } | null;
    error?: unknown;
}

function stringContent(content: unknown): string {
    return typeof content === 'string' ? content : '';
}

function metadataString(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isToolIterationMessage(msg: ChatMessageLike): boolean {
    const metadata = msg?.metadata ?? null;
    const callId = metadataString(metadata?.callId);
    const tool = metadataString(metadata?.tool);
    const type = metadataString(metadata?.type);
    const status = metadataString(metadata?.status);
    const content = stringContent(msg?.content);

    return (
        callId.length > 0 ||
        tool.length > 0 ||
        type === 'output' ||
        status === 'running' ||
        status === 'thinking' ||
        (msg?.role === 'user' && content.includes('[Tool Output for '))
    );
}

export function isRunProgressMessage(msg: ChatMessageLike): boolean {
    if (!msg || msg.error) return false;
    const metadata = msg?.metadata ?? null;
    const type = metadataString(metadata?.type);
    const status = metadataString(metadata?.status);
    return (
        isToolIterationMessage(msg) ||
        type === 'status' ||
        status === 'thinking' ||
        status === 'running'
    );
}

export function shouldClearThinkingIndicator(
    msg: ChatMessageLike,
    opts?: { activeToolCallCount?: number }
): boolean {
    // Clear if it's an error message
    if (msg?.error) {
        return true;
    }

    const metadata = msg?.metadata ?? null;
    const status = metadataString(metadata?.status);
    const final = metadata?.final === true;
    const limitReached = metadataString(metadata?.limitReached).length > 0;
    const aborted = metadata?.aborted === true;
    const activeToolCallCount = typeof opts?.activeToolCallCount === 'number'
        ? opts.activeToolCallCount
        : 0;

    // Don't clear while a run is still actively iterating.
    if (isRunProgressMessage(msg)) {
        return false;
    }

    if (status === 'error') {
        return true;
    }

    if (limitReached || aborted) {
        return true;
    }

    // Final response event from the server marks true completion.
    if (final && activeToolCallCount <= 0) {
        return true;
    }

    return false;
}
