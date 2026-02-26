
import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
    const cpus = os.cpus();
    const load = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const procMem = process.memoryUsage();

    return NextResponse.json({
        cpu: {
            loadAvg: load,
            model: cpus[0].model,
            cores: cpus.length
        },
        memory: {
            total: totalMem,
            free: freeMem,
            used: usedMem,
            process: procMem.rss
        },
        uptime: os.uptime()
    });
}
