import { NextResponse } from 'next/server';
import { getService } from '../../../../lib/agent-instance';
import {
    enrichSessionWithCustomInstructions,
    normalizeCustomInstructions,
    persistSessionCustomInstructions
} from '../../../../lib/session-custom-instructions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const service = getService();

    const data = await service.sessionManager.getSession(id);

    if (!data) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
        id: data.id,
        name: data.name,
        messages: data.messages || [],
        session: enrichSessionWithCustomInstructions(service, data)
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

    const sessionManagerCompat = service.sessionManager as unknown as {
        updateSession?: (
            targetId: string,
            updates: { name?: string; customInstructions?: string }
        ) => { success: boolean; error?: string };
        renameSession?: (targetId: string, nextName: string) => void;
    };

    if (typeof sessionManagerCompat.updateSession === 'function') {
        const result = sessionManagerCompat.updateSession(id, {
            name,
            customInstructions
        });

        if (!result.success) {
            const status = result.error === 'Session not found' ? 404 : 400;
            return NextResponse.json({ error: result.error || 'Failed to update session' }, { status });
        }
    } else {
        const existing = await service.sessionManager.getSession(id);
        if (!existing) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (name && typeof sessionManagerCompat.renameSession === 'function') {
            await sessionManagerCompat.renameSession(id, name);
        }

        if (hasInstructions) {
            const persisted = persistSessionCustomInstructions(service, id, customInstructions);
            if (!persisted) {
                return NextResponse.json({ error: 'Failed to update custom instructions' }, { status: 500 });
            }
        }
    }

    const updated = await service.sessionManager.getSession(id);
    return NextResponse.json({
        success: true,
        session: updated?.session ? enrichSessionWithCustomInstructions(service, updated.session) : null
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
