import { NextResponse } from 'next/server';
import { getConfigManager } from '../../../../lib/config-instance';
import { resetService } from '../../../../lib/agent-instance';
import { SECTION_NAMES, SectionName } from '@/src-backend/config/config-schema';

// GET /api/config/:section
export async function GET(
    request: Request,
    { params }: { params: Promise<{ section: string }> }
) {
    try {
        const { section } = await params;
        if (!SECTION_NAMES.includes(section as SectionName)) {
            return NextResponse.json(
                { error: `Unknown section: ${section}`, validSections: SECTION_NAMES },
                { status: 400 }
            );
        }
        const data: any = getConfigManager().getSection(section as SectionName, true);

        return NextResponse.json({ section, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/config/:section
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ section: string }> }
) {
    try {
        const { section } = await params;
        if (!SECTION_NAMES.includes(section as SectionName)) {
            return NextResponse.json(
                { error: `Unknown section: ${section}`, validSections: SECTION_NAMES },
                { status: 400 }
            );
        }

        const body = await request.json();
        const result = getConfigManager().updateSection(section as SectionName, body);

        if (!result.success) {
            console.error('[API] Validation failed for section:', section);
            console.error('[API] Errors:', JSON.stringify(result.errors, null, 2));
            return NextResponse.json(
                { error: 'Validation failed', errors: result.errors },
                { status: 400 }
            );
        }

        await resetService();

        const updated: any = getConfigManager().getSection(section as SectionName, true);

        return NextResponse.json({ section, data: updated, success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
