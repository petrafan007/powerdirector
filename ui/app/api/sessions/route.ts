import { NextResponse } from 'next/server';
import { getService } from '../../../lib/agent-instance';
import {
    enrichSessionWithCustomInstructions,
    normalizeCustomInstructions,
    persistSessionCustomInstructions
} from '../../../lib/session-custom-instructions';

export async function GET() {
    const service = getService();
    const rawSessions = await service.sessionManager.listSessions();
    const sessions = rawSessions.map((session) => enrichSessionWithCustomInstructions(service, session));
    return NextResponse.json(sessions);
}

export async function POST(request: Request) {
    const service = getService();
    const body = await request.json();

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const customInstructions = normalizeCustomInstructions(body?.customInstructions);

    const session = await service.sessionManager.createSession(name, { customInstructions });

    // Backward-compatible persistence path for runtimes where SessionManager
    // does not yet store customInstructions in metadata.
    if (customInstructions) {
        persistSessionCustomInstructions(service, session.id, customInstructions);
    }

    return NextResponse.json(enrichSessionWithCustomInstructions(service, session));
}
