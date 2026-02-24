import { NextResponse } from 'next/server';
import { resolveAgentWorkspace } from '@/lib/agent-paths';
import { statSync, existsSync } from 'fs';
import { join } from 'path';

const CORE_FILES = [
    'AGENTS.md',
    'SOUL.md',
    'TOOLS.md',
    'IDENTITY.md',
    'USER.md',
    'HEARTBEAT.md',
    'BOOTSTRAP.md',
    'MEMORY.md'
];

interface FileMeta {
    name: string;
    path: string;
    missing: boolean;
    size?: number;
    updatedAt?: number;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedAgentId = searchParams.get('agentId');
        const workspace = resolveAgentWorkspace(requestedAgentId);
        const agentDir = workspace.workspaceDir;

        const files: FileMeta[] = [];

        for (const filename of CORE_FILES) {
            const filePath = join(agentDir, filename);
            if (existsSync(filePath)) {
                try {
                    const stats = statSync(filePath);
                    files.push({
                        name: filename,
                        path: filePath,
                        missing: false,
                        size: stats.size,
                        updatedAt: Math.floor(stats.mtimeMs)
                    });
                } catch {
                    files.push({ name: filename, path: filePath, missing: true });
                }
            } else {
                files.push({ name: filename, path: filePath, missing: true });
            }
        }

        return NextResponse.json({
            agentId: workspace.agentId,
            workspace: agentDir,
            files
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
