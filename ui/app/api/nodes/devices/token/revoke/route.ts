import { NextRequest, NextResponse } from 'next/server';
import { revokeDeviceToken } from '../../../../../../../src/nodes/device-pairing';
import { resolvePowerDirectorRoot } from '../../../../../../lib/paths';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : '';
        const role = typeof body?.role === 'string' ? body.role.trim() : '';
        if (!deviceId || !role) {
            return NextResponse.json({ error: 'deviceId and role are required.' }, { status: 400 });
        }

        const baseDir = resolvePowerDirectorRoot();
        const revoked = await revokeDeviceToken({ deviceId, role }, baseDir);
        if (!revoked) {
            return NextResponse.json({ error: 'Unknown deviceId/role.' }, { status: 404 });
        }

        return NextResponse.json({
            deviceId,
            role: revoked.role,
            revokedAtMs: revoked.revokedAtMs ?? Date.now()
        });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to revoke token' }, { status: 400 });
    }
}
