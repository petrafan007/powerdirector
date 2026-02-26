
import { NextRequest, NextResponse } from 'next/server';
import { installSkill as installSkillDeps } from '@/src-backend/agents/skills-install';
import { loadWorkspaceSkillEntries } from '@/src-backend/agents/skills';
import { PowerDirectorService } from '@/lib/agent-instance';
import { getConfigManager } from '@/lib/config-instance';
import { resolvePowerDirectorRoot } from '@/lib/paths';

function resolveInstallId(installSpecs: any[]): string | null {
    if (!Array.isArray(installSpecs) || installSpecs.length === 0) {
        return null;
    }

    // Match OpenClaw behavior: use the first install option shown to the user.
    const first = installSpecs[0];
    const kind = typeof first?.kind === 'string' && first.kind.trim().length > 0
        ? first.kind.trim()
        : 'install';
    if (typeof first?.id === 'string' && first.id.trim().length > 0) {
        return first.id.trim();
    }
    return `${kind}-0`;
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ skillId: string }> }
) {
    const { skillId } = await context.params;
    const service = PowerDirectorService.getInstance();

    try {
        const configManager = getConfigManager();
        const config = configManager.getAll(false) as any;
        const rootDir = resolvePowerDirectorRoot();
        const configuredWorkspace = typeof config?.agents?.defaults?.workspace === 'string'
            ? config.agents.defaults.workspace.trim()
            : '';
        const workspaceDir = configuredWorkspace || rootDir;

        const entries = loadWorkspaceSkillEntries(workspaceDir, { config });
        const entry = entries.find((item) => item.skill?.name === skillId);
        if (!entry) {
            return NextResponse.json(
                { success: false, message: `Skill not found: ${skillId}` },
                { status: 404 }
            );
        }

        const installSpecs = Array.isArray(entry.metadata?.install) ? entry.metadata.install : [];
        const installId = resolveInstallId(installSpecs);
        if (!installId) {
            return NextResponse.json(
                { success: false, message: 'No installation instructions found.' },
                { status: 400 }
            );
        }

        const result = await installSkillDeps({
            workspaceDir,
            skillName: skillId,
            installId,
            timeoutMs: 120_000,
            config
        });

        // Refresh local skills cache so missing-bin status updates immediately.
        service.skillsManager.refresh();

        const payload = {
            success: result.ok,
            message: result.message,
            stdout: result.stdout,
            stderr: result.stderr,
            warnings: result.warnings
        };
        if (result.ok) {
            return NextResponse.json(payload);
        }
        return NextResponse.json(payload, { status: 400 });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
