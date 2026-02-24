// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import si from 'systeminformation';

export class SystemTool implements Tool {
    public name = 'system';
    public description = 'Get system information and metrics. Actions: load, memory, disk, network, processes.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['load', 'memory', 'disk', 'network', 'processes'] }
        },
        required: ['action']
    };

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'load':
                    const load = await si.currentLoad();
                    const cpu = await si.cpu();
                    return {
                        output: `CPU: ${cpu.manufacturer} ${cpu.brand}\nLoad: ${load.currentLoad.toFixed(2)}%\nCores: ${cpu.cores}`
                    };

                case 'memory':
                    const mem = await si.mem();
                    return {
                        output: `Total: ${(mem.total / 1024 / 1024 / 1024).toFixed(2)} GB\nUsed: ${(mem.used / 1024 / 1024 / 1024).toFixed(2)} GB\nFree: ${(mem.free / 1024 / 1024 / 1024).toFixed(2)} GB`
                    };

                case 'disk':
                    const fsSize = await si.fsSize();
                    const disks = fsSize.map(d => `${d.fs} (${d.mount}): ${(d.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(d.size / 1024 / 1024 / 1024).toFixed(2)} GB (${d.use}%)`).join('\n');
                    return { output: disks };

                case 'network':
                    const net = await si.networkInterfaces();
                    // @ts-ignore
                    const active = net.filter(n => !n.internal && n.operstate === 'up').map(n => `${n.iface}: ${n.ip4} / ${n.mac}`);
                    return { output: active.join('\n') || 'No active external interfaces found.' };

                case 'processes':
                    const procs = await si.processes();
                    const top = procs.list.sort((a, b) => b.cpu - a.cpu).slice(0, 5);
                    return {
                        output: top.map(p => `${p.name} (PID ${p.pid}): ${p.cpu.toFixed(1)}% CPU, ${p.mem.toFixed(1)}% Mem`).join('\n')
                    };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `System Error: ${error.message}`, isError: true };
        }
    }
}
