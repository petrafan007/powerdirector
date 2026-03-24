import { NextResponse } from 'next/server';
import { getService } from '../../../../lib/agent-instance';
import {
    enrichSessionWithCustomInstructions,
    normalizeCustomInstructions,
    persistSessionCustomInstructions
} from '../../../../lib/session-custom-instructions';

const MAX_MESSAGES = 200;
const MAX_MESSAGE_CONTENT_CHARS = 50_000;

type SessionSummary = {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    metadata: Record<string, unknown>;
    messages: unknown[];
    customInstructions?: string;
};

type SessionMessagePage = {
    messages: unknown[];
    totalCount: number;
    hasMore: boolean;
};

type SessionManagerCompat = {
    getSessionSummary?: (targetId: string) => SessionSummary | null;
    getSessionMessages?: (
        targetId: string,
        options?: { limit?: number; maxContentChars?: number }
    ) => SessionMessagePage;
    getSession?: (targetId: string) => SessionSummary | null;
    renameSession?: (targetId: string, nextName: string) => void | Promise<void>;
    updateSession?: (
        targetId: string,
        nextName?: string,
        metadata?: Record<string, unknown>
    ) => void | Promise<void>;
};

function getSessionManager(service: unknown): SessionManagerCompat {
    return ((service as { sessionManager?: SessionManagerCompat })?.sessionManager ?? {}) as SessionManagerCompat;
}

function getSessionSummary(service: unknown, id: string): SessionSummary | null {
    const sessionManager = getSessionManager(service);
    if (typeof sessionManager.getSessionSummary === 'function') {
        return sessionManager.getSessionSummary(id);
    }
    if (typeof sessionManager.getSession === 'function') {
        const fullSession = sessionManager.getSession(id);
        if (!fullSession) return null;
        return {
            ...fullSession,
            messages: []
        };
    }
    return null;
}

function getSessionMessages(service: unknown, id: string): SessionMessagePage {
    const sessionManager = getSessionManager(service);
    if (typeof sessionManager.getSessionMessages === 'function') {
        return sessionManager.getSessionMessages(id, {
            limit: MAX_MESSAGES,
            maxContentChars: MAX_MESSAGE_CONTENT_CHARS
        });
    }
    if (typeof sessionManager.getSession === 'function') {
        const fullSession = sessionManager.getSession(id);
        const allMessages = fullSession?.messages || [];
        return {
            messages: allMessages.slice(0, MAX_MESSAGES),
            totalCount: allMessages.length,
            hasMore: allMessages.length > MAX_MESSAGES
        };
    }
    return {
        messages: [],
        totalCount: 0,
        hasMore: false
    };
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const service = getService();

    const data = getSessionSummary(service, id);

    if (!data) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const messagePage = getSessionMessages(service, id);

    return NextResponse.json({
        id: data.id,
        name: data.name,
        messages: messagePage.messages,
        session: enrichSessionWithCustomInstructions(service, data),
        hasMoreMessages: messagePage.hasMore,
        messageCount: messagePage.totalCount
    });
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    const service = getService();

    const hasName = typeof body?.name === 'string';
    const hasInstructions = Object.prototype.hasOwnProperty.call(body || {}, 'customInstructions');
    if (!hasName && !hasInstructions) {
        return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const name = hasName ? String(body.name || '').trim() : undefined;
    if (hasName && !name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const customInstructions = hasInstructions
        ? normalizeCustomInstructions(body.customInstructions)
        : undefined;
    const sessionManager = getSessionManager(service);

    const existing = getSessionSummary(service, id);
    if (!existing) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (name) {
        if (typeof sessionManager.renameSession === 'function') {
            await sessionManager.renameSession(id, name);
        } else if (typeof sessionManager.updateSession === 'function') {
            await sessionManager.updateSession(id, name);
        } else {
            return NextResponse.json({ error: 'Session rename is unavailable' }, { status: 500 });
        }
    }

    if (hasInstructions) {
        const persisted = persistSessionCustomInstructions(service, id, customInstructions);
        if (!persisted) {
            return NextResponse.json({ error: 'Failed to update custom instructions' }, { status: 500 });
        }
    }

    const updated = getSessionSummary(service, id);
    return NextResponse.json({
        success: true,
        session: updated ? enrichSessionWithCustomInstructions(service, updated) : null
    });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const service = getService();

    service.sessionManager.deleteSession(id);
    return NextResponse.json({ success: true });
}
