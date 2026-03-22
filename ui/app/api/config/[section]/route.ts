import { NextResponse } from 'next/server';
import { getConfigManager } from '../../../../lib/config-instance';
import { resetService } from '../../../../lib/agent-instance';
import { isSectionName, normalizeSectionName, SECTION_NAMES } from '@/src-backend/config/config-schema';

// GET /api/config/:section
export async function GET(
    request: Request,
    { params }: { params: Promise<{ section: string }> }
) {
    try {
        const { section: requestedSection } = await params;
        const section = normalizeSectionName(requestedSection);
        if (!isSectionName(section)) {
            return NextResponse.json(
                { error: `Unknown section: ${requestedSection}`, validSections: SECTION_NAMES },
                { status: 400 }
            );
        }
        const data: any = getConfigManager().getSection(section, true);

        return NextResponse.json({ section: requestedSection, canonicalSection: section, data });
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
        const { section: requestedSection } = await params;
        const section = normalizeSectionName(requestedSection);
        if (!isSectionName(section)) {
            return NextResponse.json(
                { error: `Unknown section: ${requestedSection}`, validSections: SECTION_NAMES },
                { status: 400 }
            );
        }

        let body = await request.json();

        // Fix for Bug 6: Frontend settings form passes arrays (like bindings) as objects with index keys
        if (section === 'bindings' && body && typeof body === 'object' && !Array.isArray(body)) {
            body = Object.values(body);
        }

        const result = getConfigManager().updateSection(section, body);

        if (!result.success) {
            console.error('[API] Validation failed for section:', section);
            console.error('[API] Errors:', JSON.stringify(result.errors, null, 2));
            return NextResponse.json(
                { error: 'Validation failed', errors: result.errors },
                { status: 400 }
            );
        }

        await resetService();

        const updated: any = getConfigManager().getSection(section, true);

        return NextResponse.json({
            section: requestedSection,
            canonicalSection: section,
            data: updated,
            success: true,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
