
import { NextResponse } from 'next/server';
import { getService } from '@/lib/agent-instance';
import { TICK_INTERVAL_MS } from '@/src-backend/gateway/server-constants';

export async function GET() {
    try {
        // Calling getService() ensures runtime managers are initialized.
        const { listSystemPresence } = await import('@/src-backend/infra/system-presence');
        const service = getService();
        const presence = listSystemPresence();
        const sessionsCount = service.sessionManager.listSessions().length;
        const cronStatus = service.gateway?.cronManager?.getStatus();

        return NextResponse.json({
            connected: true,
            hello: {
                snapshot: {
                    uptimeMs: Math.round(process.uptime() * 1000),
                    policy: {
                        tickIntervalMs: TICK_INTERVAL_MS
                    }
                }
            },
            presenceCount: presence.length,
            sessionsCount,
            cronEnabled: typeof cronStatus?.enabled === 'boolean' ? cronStatus.enabled : null,
            cronNext: typeof cronStatus?.nextWakeAtMs === 'number' ? cronStatus.nextWakeAtMs : null,
            // PowerDirector tracks this client-side from channel refresh actions.
            lastChannelsRefresh: null,
            lastError: null
        });
    } catch (error: any) {
        return NextResponse.json({
            connected: false,
            hello: null,
            presenceCount: 0,
            sessionsCount: null,
            cronEnabled: null,
            cronNext: null,
            lastChannelsRefresh: null,
            lastError: error?.message || 'Failed to load overview status.'
        }, { status: 500 });
    }
}
