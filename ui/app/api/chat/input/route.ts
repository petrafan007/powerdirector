import { NextResponse } from 'next/server';
import { getService } from '../../../../lib/agent-instance';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { callId, input } = body;

        if (!callId || input === undefined) {
            return NextResponse.json({ error: 'Missing callId or input' }, { status: 400 });
        }

        const service = getService();
        // Use any to avoid importing ShellTool class and causing circular dependencies
        const shellTool = service.agent.getToolRegistry().get('shell') as any;

        if (!shellTool) {
            console.error('[API/Chat/Input] Shell tool not found in registry');
            return NextResponse.json({ error: 'Shell tool not found' }, { status: 404 });
        }

        const success = shellTool.writeStdin(callId, input);
        console.log(`[API/Chat/Input] writeStdin success: ${success}`);
        return NextResponse.json({ success });
    } catch (error: any) {
        console.error('[API/Chat/Input] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
