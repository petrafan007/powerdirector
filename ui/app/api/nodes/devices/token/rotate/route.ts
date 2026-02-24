import { NextRequest, NextResponse } from 'next/server';
import { rotateDeviceToken } from '../../../../../../../src/nodes/device-pairing';
import { resolvePowerDirectorRoot } from '../../../../../../lib/paths';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : '';
        const role = typeof body?.role === 'string' ? body.role.trim() : '';
        if (!deviceId || !role) {
            return NextResponse.json({ error: 'deviceId and role are required.' }, { status: 400 });
        }

        const scopes = Array.isArray(body?.scopes)
            ? body.scopes.filter((entry: unknown) => typeof entry === 'string')
            : undefined;
        const baseDir = resolvePowerDirectorRoot();
        const token = await rotateDeviceToken({ deviceId, role, scopes }, baseDir);
        if (!token) {
            return NextResponse.json({ error: 'Unknown deviceId/role.' }, { status: 404 });
        }

        return NextResponse.json({
            deviceId,
            role: token.role,
            token: token.token,
            scopes: token.scopes,
            rotatedAtMs: token.rotatedAtMs ?? token.createdAtMs
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to rotate token' }, { status: 400 });
    }
}
