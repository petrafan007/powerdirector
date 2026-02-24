
import { NextResponse } from 'next/server';
import { resolveAgentWorkspace } from '@/lib/agent-paths';
import { readFile, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
const readFileAsync = promisify(readFile);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agentId');
        const workspace = resolveAgentWorkspace(agentId);
        const identityPath = join(workspace.workspaceDir, 'IDENTITY.md');

        if (!existsSync(identityPath)) {
            return NextResponse.json({ name: 'System Agent', emoji: '🤖', missing: true, path: identityPath });
        }

        console.log(`Loading identity from: ${identityPath}`);
        const content = await readFileAsync(identityPath, 'utf-8');
        console.log(`Content length: ${content.length}`);

        const lines = content.split('\n');
        let name = 'System Agent';
        let emoji = '🤖';

        for (const line of lines) {
            const trimmed = line.trim();
            const lower = trimmed.toLowerCase();

            // Check if line contains "name" and a colon
            if (lower.includes('name') && trimmed.includes(':')) {
                const parts = trimmed.split(':');
                if (parts.length > 1) {
                    // Join back the rest in case the name has a colon
                    let val = parts.slice(1).join(':').trim();
                    // Remove markdown formatting (*, _, `) from start and end
                    val = val.replace(/^[*_`\s]+|[*_`\s]+$/g, '');

                    if (val) name = val;
                }
            } else if (trimmed.startsWith('emoji:')) {
                emoji = trimmed.replace('emoji:', '').trim();
            } else if (trimmed.startsWith('# ')) {
                // Fallback to markdown header if we haven't found a name yet
                if (name === 'System Agent') name = trimmed.replace('# ', '').trim();
            }
        }

        return NextResponse.json({
            name,
            emoji,
            missing: false,
            id: workspace.agentId,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
