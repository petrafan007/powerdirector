import { NextResponse } from 'next/server';
import { getService } from '../../../lib/agent-instance';
import { shouldUseConfiguredDefaultChain } from '../../../lib/chat-model-selection';

function toStringOrUndefined(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function serializeError(error: any): {
    error: string;
    code?: string;
    details?: string;
    failures?: Array<{ provider?: string; code?: string; message: string }>;
} {
    const message = toStringOrUndefined(error?.message) || String(error || 'Unknown error');
    const code = toStringOrUndefined(error?.code);

    const rawCauses = Array.isArray(error?.cause)
        ? error.cause
        : (error?.cause ? [error.cause] : []);

    const failures: Array<{ provider?: string; code?: string; message: string }> = rawCauses
        .map((cause: any) => {
            const provider = toStringOrUndefined(cause?.provider);
            const causeCode = toStringOrUndefined(cause?.code);
            const causeMessage = toStringOrUndefined(cause?.message) || String(cause || 'Unknown failure');
            return {
                provider,
                code: causeCode,
                message: causeMessage
            };
        })
        .filter((failure: { message?: string }) => Boolean(failure.message));

    const detailLines = failures.map((failure: { provider?: string; code?: string; message: string }) => {
        const provider = failure.provider || 'provider';
        const failureCode = failure.code ? `[${failure.code}] ` : '';
        return `${provider}: ${failureCode}${failure.message}`;
    });

    return {
        error: message,
        code,
        details: detailLines.length > 0 ? detailLines.join('\n') : undefined,
        failures: failures.length > 0 ? failures : undefined
    };
}

function normalizeReasoning(value: unknown): 'low' | 'medium' | 'high' | 'xhigh' | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'xhigh') {
        return normalized;
    }
    if (normalized === 'extra high' || normalized === 'extra-high' || normalized === 'extra_high') {
        return 'xhigh';
    }
    return undefined;
}

function normalizeProviderId(value: unknown): string | undefined {
    const provider = toStringOrUndefined(value);
    if (!provider) return undefined;
    if (provider.toLowerCase() === 'default') return undefined;
    return provider;
}

function normalizeModelId(value: unknown): string | undefined {
    const model = toStringOrUndefined(value);
    if (!model) return undefined;
    if (model.toLowerCase() === 'default') return undefined;
    return model;
}

function resolveRequestedModelId(providerRaw: unknown, modelRaw: unknown): string | undefined {
    const provider = normalizeProviderId(providerRaw);
    const model = normalizeModelId(modelRaw);
    if (!provider && !model) return undefined;
    if (!provider && model) return model;
    if (provider && !model) return undefined;

    const providerLower = provider!.toLowerCase();
    const modelLower = model!.toLowerCase();
    if (modelLower.startsWith(`${providerLower}/`)) {
        return model!;
    }
    return `${provider}/${model}`;
}

function isPlainObject(value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function POST(request: Request) {
    const body = await request.json();
    const { sessionId, message, attachments, runId: incomingRunId } = body;

    const hasMessage = typeof message === 'string'
        ? message.trim().length > 0
        : Boolean(message);
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    const isContinue = body.continue === true;

    if (!sessionId || (!hasMessage && !hasAttachments && !isContinue)) {
        return NextResponse.json({ error: 'Missing sessionId or input content' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    try {
        const service = getService();

        // Only treat explicit non-default selections as provider overrides.
        const modelId = resolveRequestedModelId(body.provider, body.model);
        const useDefaultModelChain = shouldUseConfiguredDefaultChain({
            provider: body.provider,
            model: body.model,
            useDefaultModelChain: body.useDefaultModelChain
        });
        const agentId = toStringOrUndefined(body.agentId);
        const reasoning = normalizeReasoning(body.reasoning);

        let activeRunId: string | null = null;
        let activeSessionKey: string | null = null;

        const stream = new ReadableStream({
            async start(controller) {
                let streamClosed = false;
                const safeEnqueue = (chunk: Uint8Array) => {
                    if (streamClosed) return false;
                    try {
                        controller.enqueue(chunk);
                        return true;
                    } catch {
                        streamClosed = true;
                        return false;
                    }
                };
                const safeSend = (payload: Record<string, any>) =>
                    safeEnqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                const safeClose = () => {
                    if (streamClosed) return;
                    streamClosed = true;
                    try {
                        controller.close();
                    } catch {
                        // no-op: already closed/cancelled
                    }
                };

                const heartbeat = setInterval(() => {
                    const ok = safeEnqueue(encoder.encode(': heartbeat\n\n'));
                    if (!ok) {
                        clearInterval(heartbeat);
                    }
                }, 5000);

                const onStep = (msg: any) => {
                    if (msg?.metadata?.status === 'fallback') {
                        console.error(`[API/Chat] Provider fallback occurred: ${msg.content}`);
                    }
                    safeSend({ step: msg });
                };

                try {
                    const runId = incomingRunId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                    activeRunId = runId;
                    safeSend({ runId });

                    let { output: response, sessionId: targetSessionId } = await service.gateway.processInput(sessionId, message || (isContinue ? 'Continue.' : ''), {
                        senderId: 'ui-user',
                        channelId: 'ui-api',
                        metadata: {
                            attachments: Array.isArray(attachments) ? attachments : [],
                            model: useDefaultModelChain ? 'default' : modelId,
                            reasoning,
                            agentId,
                            continue: isContinue
                        },
                        onStep,
                        runId
                    });

                    activeSessionKey = targetSessionId;

                    let responseMeta: Record<string, any> | undefined;
                    let responseTimestamp: number | undefined;
                    try {
                        const sessionManager = service.sessionManager;
                        // We try the old one first, then look for any session updated in the last 60s for this user.
                        let sessionData = sessionManager.getSession(targetSessionId);

                        const findAssistant = (data: any) => data?.messages?.slice().reverse().find((m: any) => m.role === 'assistant' && !m.metadata?.callId);

                        let latestAssistant = findAssistant(sessionData);

                        if (!latestAssistant) {
                            // Try to find if a session was just created/updated for this UI peer
                            const recentSessions = sessionManager.listSessions().filter(s => (Date.now() - s.updatedAt) < 60000);
                            for (const s of recentSessions) {
                                const data = sessionManager.getSession(s.id);
                                const found = findAssistant(data);
                                if (found) {
                                    latestAssistant = found;
                                    targetSessionId = s.id;
                                    activeSessionKey = s.id;
                                    break;
                                }
                            }
                        }

                        if (latestAssistant) {
                            if (isPlainObject(latestAssistant.metadata)) {
                                responseMeta = latestAssistant.metadata;
                            }
                            if (typeof latestAssistant.timestamp === 'number' && Number.isFinite(latestAssistant.timestamp)) {
                                responseTimestamp = latestAssistant.timestamp;
                            }
                        }
                    } catch (metaErr) {
                        console.warn('[API/Chat] Failed to resolve response metadata:', metaErr);
                    }

                    safeSend({ response, responseMeta, responseTimestamp, sessionId: targetSessionId });
                } catch (error: any) {
                    console.error('[API/Chat] Stream Error:', error);
                    safeSend(serializeError(error));
                } finally {
                    clearInterval(heartbeat);
                    safeClose();
                }
            },
            cancel() {
                if (!activeSessionKey || !activeRunId) return;
                try {
                    service.gateway.abortRun(activeSessionKey, activeRunId);
                } catch (err) {
                    console.warn('[API/Chat] cancel abort failed:', err);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    } catch (error: any) {
        console.error('[API/Chat] Error:', error);
        return NextResponse.json(serializeError(error), { status: 500 });
    }
}
