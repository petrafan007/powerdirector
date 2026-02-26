import { NextRequest, NextResponse } from 'next/server';
import { getService } from '../../../../lib/agent-instance';
import { resolvePowerDirectorRoot } from '../../../../lib/paths';
import {
    ensureExecApprovals,
    mergeExecApprovalsSocketDefaults,
    normalizeExecApprovals,
    readExecApprovalsSnapshot,
    saveExecApprovals,
    ExecApprovalsFile
} from '../../../../../src/nodes/exec-approvals';

function redactExecApprovals(file: ExecApprovalsFile): ExecApprovalsFile {
    const socketPath = file.socket?.path?.trim();
    return {
        ...file,
        socket: socketPath ? { path: socketPath } : undefined
    };
}

function parseTarget(req: NextRequest): { kind: 'gateway' | 'node'; nodeId: string | null } {
    const targetRaw = (req.nextUrl.searchParams.get('target') || 'gateway').trim().toLowerCase();
    if (targetRaw === 'node') {
        const nodeId = (req.nextUrl.searchParams.get('nodeId') || '').trim();
        return { kind: 'node', nodeId: nodeId || null };
    }
    return { kind: 'gateway', nodeId: null };
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
    try {
        const target = parseTarget(req);
        if (target.kind === 'gateway') {
            const baseDir = resolvePowerDirectorRoot();
            ensureExecApprovals(baseDir);
            const snapshot = readExecApprovalsSnapshot(baseDir);
            return NextResponse.json({
                path: snapshot.path,
                exists: snapshot.exists,
                hash: snapshot.hash,
                file: redactExecApprovals(snapshot.file)
            });
        }

        if (!target.nodeId) {
            return NextResponse.json({ error: 'nodeId is required for node target.' }, { status: 400 });
        }

        const service = getService();
        const outcome = await service.gateway.nodeManager.sendCommand(
            target.nodeId,
            'system.execApprovals.get',
            {},
            { timeoutMs: 30000 }
        );
        if (!outcome.success) {
            return NextResponse.json({ error: outcome.error || 'Node returned an error.' }, { status: 502 });
        }

        const payload = asObject(outcome.result);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid node exec approvals response.' }, { status: 502 });
        }

        return NextResponse.json(payload);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to load exec approvals' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const targetRaw = typeof body?.target === 'string' ? body.target.trim().toLowerCase() : 'gateway';
        const target = targetRaw === 'node' ? 'node' : 'gateway';
        const nodeId = typeof body?.nodeId === 'string' ? body.nodeId.trim() : '';
        const baseHash = typeof body?.baseHash === 'string' ? body.baseHash.trim() : '';
        const incoming = body?.file as ExecApprovalsFile | undefined;

        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
            return NextResponse.json({ error: 'exec approvals file is required.' }, { status: 400 });
        }

        if (target === 'gateway') {
            const baseDir = resolvePowerDirectorRoot();
            ensureExecApprovals(baseDir);
            const snapshot = readExecApprovalsSnapshot(baseDir);
            if (snapshot.exists) {
                if (!baseHash) {
                    return NextResponse.json({ error: 'baseHash is required; reload approvals and retry.' }, { status: 400 });
                }
                if (baseHash !== snapshot.hash) {
                    return NextResponse.json({ error: 'exec approvals changed since last load; reload and retry.' }, { status: 409 });
                }
            }

            const normalized = normalizeExecApprovals(incoming);
            const merged = mergeExecApprovalsSocketDefaults({
                normalized,
                current: snapshot.file,
                baseDir
            });
            saveExecApprovals(merged, baseDir);
            const nextSnapshot = readExecApprovalsSnapshot(baseDir);
            return NextResponse.json({
                path: nextSnapshot.path,
                exists: nextSnapshot.exists,
                hash: nextSnapshot.hash,
                file: redactExecApprovals(nextSnapshot.file)
            });
        }

        if (!nodeId) {
            return NextResponse.json({ error: 'nodeId is required for node target.' }, { status: 400 });
        }

        const service = getService();
        const outcome = await service.gateway.nodeManager.sendCommand(
            nodeId,
            'system.execApprovals.set',
            { file: incoming, baseHash },
            { timeoutMs: 30000 }
        );
        if (!outcome.success) {
            return NextResponse.json({ error: outcome.error || 'Node returned an error.' }, { status: 502 });
        }

        const payload = asObject(outcome.result);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid node exec approvals response.' }, { status: 502 });
        }

        return NextResponse.json(payload);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to save exec approvals' }, { status: 500 });
    }
}
