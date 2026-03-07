import { NextResponse } from 'next/server';
import { getUpdateJobSnapshot, refreshUpdateStatus, startUpdateInstall } from '../../../lib/update-runtime';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const jobId = url.searchParams.get('jobId');
        if (jobId) {
            const job = getUpdateJobSnapshot(jobId);
            if (!job) {
                return NextResponse.json({ error: 'Update job not found' }, { status: 404 });
            }
            return NextResponse.json({ job });
        }

        const refresh = url.searchParams.get('refresh') === '1';
        const status = await refreshUpdateStatus({ forceCheck: refresh });
        return NextResponse.json(status);
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to load update status' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const channel = typeof body?.channel === 'string' ? body.channel : undefined;
        const job = await startUpdateInstall(channel);
        return NextResponse.json({ ok: true, job });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to start update install' }, { status: 500 });
    }
}
