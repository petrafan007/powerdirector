
import { NextRequest, NextResponse } from 'next/server';
import { PowerDirectorService } from '@/lib/agent-instance';
import { getConfigManager } from '@/lib/config-instance';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ skillId: string }> }
) {
    const { skillId } = await context.params;
    const body = await req.json();
    const { enabled, apiKey } = body;

    const service = PowerDirectorService.getInstance();

    try {
        // 1. Update SkillsManager (syncs with powerdirector.config.json)
        await service.skillsManager.updateSkillConfig(skillId, enabled, apiKey);

        // 2. Update ConfigManager (syncs with powerdirector.config.json)
        const configManager = getConfigManager();
        const skillsSection = configManager.getSection('skills') || { entries: {} };

        if (!skillsSection.entries) {
            skillsSection.entries = {};
        }

        const currentEntry = skillsSection.entries[skillId] || {};

        const updatedEntry = {
            ...currentEntry,
            enabled: enabled !== undefined ? enabled : (currentEntry.enabled ?? false),
            apiKey: apiKey !== undefined ? apiKey : currentEntry.apiKey
        };

        skillsSection.entries[skillId] = updatedEntry;

        configManager.updateSection('skills', skillsSection);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error(`[API] Failed to update skill config for ${skillId}:`, error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
