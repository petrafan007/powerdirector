
import { NextResponse } from 'next/server';
import os from 'os';
import { getService } from '../../../../lib/agent-instance';

export async function GET() {
    const uptime = os.uptime();
    const service = getService();
    const gateway = service.gateway;

    const activeAgents = gateway.getActiveAgentsCount();
    const queueDepth = gateway.getTotalQueueDepth();
    const activeSessions = gateway.getActiveSessionsCount();
    const memoryUsage = process.memoryUsage();

    return NextResponse.json({
        status: 'Operational',
        uptime,
        activeAgents,
        queueDepth,
        activeSessions,
        system: {
            loadAvg: os.loadavg(),
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                process: memoryUsage.rss
            }
        }
    });
}
