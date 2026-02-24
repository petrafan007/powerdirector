import { NextRequest, NextResponse } from 'next/server';
import { getService } from '../../../lib/agent-instance';
import { authorizeNodeRequest } from '../../../lib/nodes-auth';
import { resolvePowerDirectorRoot } from '../../../lib/paths';
import { buildNodeList } from '../../../../src/nodes/node-list';
import { listDevicePairing } from '../../../../src/nodes/device-pairing';
import { NodeInfo } from '../../../../src/nodes/manager';

const VALID_PLATFORMS = ['macos', 'ios', 'android', 'linux', 'windows'] as const;

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const out = new Set<string>();
    for (const item of value) {
        if (typeof item !== 'string') continue;
        const trimmed = item.trim();
        if (!trimmed) continue;
        out.add(trimmed);
    }
    return [...out];
}

function parseNodePayload(raw: unknown, req: NextRequest): NodeInfo {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('Invalid node registration payload.');
    }
    const body = raw as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const nameValue = typeof body.name === 'string' ? body.name.trim() : '';
    const name = displayName || nameValue;
    const platformRaw = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : '';
    const version = typeof body.version === 'string' && body.version.trim()
        ? body.version.trim()
        : '1.0.0';

    if (!id || !name) {
        throw new Error('Node registration requires id and name.');
    }
    if (!VALID_PLATFORMS.includes(platformRaw as any)) {
        throw new Error(`Invalid platform "${platformRaw}".`);
    }

    const forwardedIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const remoteIp = typeof body.remoteIp === 'string' && body.remoteIp.trim()
        ? body.remoteIp.trim()
        : (forwardedIp || undefined);

    return {
        id,
        name,
        displayName: displayName || name,
        platform: platformRaw as NodeInfo['platform'],
        version,
        coreVersion: typeof body.coreVersion === 'string' ? body.coreVersion.trim() : undefined,
        uiVersion: typeof body.uiVersion === 'string' ? body.uiVersion.trim() : undefined,
        deviceFamily: typeof body.deviceFamily === 'string' ? body.deviceFamily.trim() : undefined,
        modelIdentifier: typeof body.modelIdentifier === 'string' ? body.modelIdentifier.trim() : undefined,
        remoteIp,
        capabilities: normalizeStringArray(body.capabilities),
        commands: normalizeStringArray(body.commands),
        permissions: normalizeStringArray(body.permissions),
        pathEnv: normalizeStringArray(body.pathEnv),
        status: 'online',
        lastSeen: Date.now(),
        connectedAtMs: Date.now()
    };
}

export async function GET() {
    try {
        const service = getService();
        const baseDir = resolvePowerDirectorRoot();
        const pairing = await listDevicePairing(baseDir);
        const nodes = buildNodeList(service.gateway.nodeManager, pairing);
        return NextResponse.json({
            ts: Date.now(),
            nodes
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to load nodes' }, { status: 500 });
    }
}

// POST /api/nodes — register a node (worker mode parity with PowerDirector node list flow).
export async function POST(req: NextRequest) {
    const auth = authorizeNodeRequest(req);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    try {
        const service = getService();
        const payload = await req.json();
        const node = parseNodePayload(payload, req);
        service.gateway.nodeManager.registerNode(node);
        return NextResponse.json({
            success: true,
            nodeId: node.id
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to register node' }, { status: 400 });
    }
}
