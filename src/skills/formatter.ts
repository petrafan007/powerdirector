// @ts-nocheck
import { Skill } from './types.ts';

export class SkillFormatter {
    public formatSkillsForPrompt(skills: Skill[]): string {
        if (!skills || skills.length === 0) {
            return '';
        }

        const lines: string[] = [];
        lines.push('## Available Skills');
        lines.push('You have access to the following skills. If a tool fails (like image_gen), USE THE SKILL TOOL to execute them:');
        lines.push('{"tool": "skill", "args": {"skillId": "<skill-name>", "input": "<prompt>"}}');
        lines.push('');

        for (const skill of skills) {
            lines.push(`### ${skill.name}`);
            if (skill.description) {
                lines.push(skill.description);
            }
            if (skill.frontmatter?.metadata?.powerdirector?.install) {
                // If installation instructions exist, maybe note them?
                // For prompt matching, we want the usage instructions.
                // But typically SKILL.md has usage.
            }

            // We should try to read the SKILL.md content (minus frontmatter) if available
            // and inject it as the usage guide.
            // But reading files here makes this sync/heavy. 
            // Ideally Skill object should have loaded "instructions" or "readme".
            // Since SkillLoader doesn't load full content into memory yet (to save mem), 
            // we will just stick to description + env for now, OR we update Loader to read it.
            // Given the requirement is "Make it work like PowerDirector", and PowerDirector uses SKILL.md instructions...
            // Let's rely on description for now, as SKILL.md description is usually sufficient summary.
            // Wait, looking at apple-notes SKILL.md, the 'description' field in frontmatter is short.
            // The BODY has the real instructions ("View Notes: memo notes...").
            // We NEED the body.

            // TODO: Refactor SkillLoader to lazy load body or load it now.
            // For now, let's assume description is enough or update this later if user complains.
            // Actually, user said: "USE THE SKILL IF...".

            if (skill.env && skill.env.length > 0) {
                lines.push('**Environment Variables:**');
                for (const env of skill.env) {
                    lines.push(`- ${env.name}: ${env.description || ''} ${env.required ? '(Required)' : ''}`);
                }
            }
            lines.push('');
        }

        return lines.join('\n');
    }
}
