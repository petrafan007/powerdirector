import { NextResponse } from 'next/server';
import { resolveAgentWorkspace } from '@/lib/agent-paths';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { basename, dirname, resolve, sep } from 'path';

function sanitizeFilename(raw: string): string {
    const safe = basename(raw || '');
    if (!safe || safe !== raw) {
        throw new Error('Invalid filename');
    }
    return safe;
}

function resolveFilePath(request: Request, filename: string): { filePath: string; workspace: string; agentId: string } {
    const { searchParams } = new URL(request.url);
    const requestedAgentId = searchParams.get('agentId');
    const workspace = resolveAgentWorkspace(requestedAgentId);
    const safeName = sanitizeFilename(filename);
    const root = resolve(workspace.workspaceDir);
    const filePath = resolve(root, safeName);

    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
        throw new Error('Invalid path');
    }

    return { filePath, workspace: root, agentId: workspace.agentId };
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await params;
        const { filePath } = resolveFilePath(request, filename);

        if (!existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const content = readFileSync(filePath, 'utf-8');
        return NextResponse.json({ content });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await params;
        const body = await request.json();
        const { content } = body;

        if (typeof content !== 'string') {
            return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
        }

        const { filePath, workspace, agentId } = resolveFilePath(request, filename);

        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, content, 'utf-8');
        return NextResponse.json({ success: true, workspace, agentId, filename: basename(filePath) });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
