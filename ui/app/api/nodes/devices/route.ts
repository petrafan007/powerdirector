import { NextRequest, NextResponse } from 'next/server';
import {
    listDevicePairing,
    requestDevicePairing,
    summarizeDeviceTokens
} from '../../../../../src/nodes/device-pairing';
import { resolvePowerDirectorRoot } from '../../../../lib/paths';

function redactDevice(device: any): any {
    const { tokens, ...rest } = device;
    return {
        ...rest,
        tokens: summarizeDeviceTokens(tokens)
    };
}

// GET /api/nodes/devices
export async function GET() {
    try {
        const baseDir = resolvePowerDirectorRoot();
        const list = await listDevicePairing(baseDir);
        return NextResponse.json({
            pending: list.pending,
            paired: list.paired.map((device) => redactDevice(device))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to load devices' }, { status: 500 });
    }
}

// POST /api/nodes/devices (create pairing request)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : '';
        if (!deviceId) {
            return NextResponse.json({ error: 'deviceId is required.' }, { status: 400 });
        }
        const baseDir = resolvePowerDirectorRoot();
        const remoteIp = typeof body?.remoteIp === 'string' && body.remoteIp.trim()
            ? body.remoteIp.trim()
            : (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined);

        const result = await requestDevicePairing({
            deviceId,
            displayName: typeof body?.displayName === 'string' ? body.displayName.trim() : undefined,
            platform: typeof body?.platform === 'string' ? body.platform.trim() : undefined,
            role: typeof body?.role === 'string' ? body.role.trim() : undefined,
            roles: Array.isArray(body?.roles)
                ? body.roles.filter((entry: unknown) => typeof entry === 'string')
                : undefined,
            scopes: Array.isArray(body?.scopes)
                ? body.scopes.filter((entry: unknown) => typeof entry === 'string')
                : undefined,
            remoteIp
        }, baseDir);

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to create pairing request' }, { status: 400 });
    }
}
