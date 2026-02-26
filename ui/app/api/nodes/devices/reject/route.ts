import { NextRequest, NextResponse } from 'next/server';
import { rejectDevicePairing } from '@/src-backend/nodes/device-pairing';
import { resolvePowerDirectorRoot } from '../../../../../lib/paths';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : '';
        if (!requestId) {
            return NextResponse.json({ error: 'requestId is required.' }, { status: 400 });
        }

        const baseDir = resolvePowerDirectorRoot();
        const rejected = await rejectDevicePairing(requestId, baseDir);
        if (!rejected) {
            return NextResponse.json({ error: 'Unknown requestId.' }, { status: 404 });
        }

        return NextResponse.json(rejected);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to reject pairing request' }, { status: 400 });
    }
}
