import { NextResponse } from 'next/server';
import { getUpdateJobSnapshot, restartInstalledApp } from '../../../../lib/update-runtime';

export async function POST() {
    try {
        const job = getUpdateJobSnapshot();
        if (!job?.restartReady) {
            return NextResponse.json({ error: 'No completed update is ready to restart' }, { status: 400 });
        }

        const restart = restartInstalledApp();
        if (!restart.ok) {
            return NextResponse.json(
                { error: restart.detail || `Restart failed (${restart.mode})`, restart },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, restart });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Failed to restart application' }, { status: 500 });
    }
}
