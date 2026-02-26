import { NextResponse } from 'next/server';
import { PowerDirectorService } from '@/lib/agent-instance';

export async function GET() {
    try {
        const service = PowerDirectorService.getInstance();
        const allSkills = service.skillsManager.list();

        const builtIn = allSkills.filter((skill) => skill.source === 'powerdirector-bundled');
        const workspaceOnly = allSkills.filter((skill) => skill.source === 'powerdirector-workspace');
        const pluginSkills = allSkills.filter((skill) => skill.source === 'powerdirector-plugin');
        const workspaceAndPlugin = allSkills.filter(
            (skill) => skill.source !== 'powerdirector-bundled'
        );

        return NextResponse.json({
            // Backward compatibility: agents page expects built-ins under "skills"
            // and all non-bundled under "workspaceSkills".
            skills: builtIn,
            workspaceSkills: workspaceAndPlugin,
            // Explicit groups for dedicated /skills parity page.
            workspaceOnlySkills: workspaceOnly,
            pluginSkills,
            allSkills,
            report: {
                skills: allSkills,
                counts: {
                    total: allSkills.length,
                    builtIn: builtIn.length,
                    workspace: workspaceOnly.length,
                    plugin: pluginSkills.length
                }
            }
        });
    } catch (error: any) {
        console.error('[API] GET /api/skills failed:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to list skills', error: error.message },
            { status: 500 }
        );
    }
}
