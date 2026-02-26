import { NextResponse } from 'next/server';
import { getConfigManager } from '../../../lib/config-instance';
import { resetService } from '../../../lib/agent-instance';
import { SECTION_NAMES } from '@/src-backend/config/config-schema';

// GET /api/config — returns full config (secrets masked)
export async function GET() {
    try {
        const config = getConfigManager().getAll(true);
        return NextResponse.json({
            config,
            data: config,
            sections: SECTION_NAMES,
            configPath: getConfigManager().getConfigPath()
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/config — update full config
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const mgr = getConfigManager();
        const result = mgr.update(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', errors: result.errors },
                { status: 400 }
            );
        }

        await resetService();

        const config = mgr.getAll(true);
        return NextResponse.json({
            success: true,
            config,
            data: config
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/config — bulk actions (import, export, reset)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, data } = body;
        const mgr = getConfigManager();

        switch (action) {
            case 'export': {
                const exported = mgr.exportConfig();
                return NextResponse.json({ config: JSON.parse(exported) });
            }
            case 'import': {
                if (!data) {
                    return NextResponse.json({ error: 'Missing config data' }, { status: 400 });
                }
                const result = mgr.importConfig(typeof data === 'string' ? data : JSON.stringify(data));
                if (!result.success) {
                    return NextResponse.json(
                        { error: 'Validation failed', errors: result.errors },
                        { status: 400 }
                    );
                }
                await resetService();
                return NextResponse.json({ success: true, data: mgr.getAll(true) });
            }
            case 'reset': {
                mgr.resetToDefaults();
                await resetService();
                return NextResponse.json({ success: true, data: mgr.getAll(true) });
            }
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
