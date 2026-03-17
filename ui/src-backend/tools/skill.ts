// @ts-nocheck
import { Tool, ToolResult } from './base';

interface SkillToolOptions {
    getSkillsManager: () => any;
}

export class SkillTool implements Tool {
    public name = 'skill';
    public description = 'Execute a PowerDirector skill by ID. Use this to run skills like nano-banana-pro for image generation.';
    public parameters = {
        type: 'object',
        properties: {
            skillId: {
                type: 'string',
                description: 'The ID of the skill to execute (e.g., "nano-banana-pro")'
            },
            input: {
                type: 'string',
                description: 'The input/prompt to pass to the skill'
            }
        },
        required: ['skillId', 'input']
    };

    private getSkillsManager: () => any;

    constructor(options: SkillToolOptions) {
        this.getSkillsManager = options.getSkillsManager;
    }

    async execute(args: any): Promise<ToolResult> {
        const skillId = args.skillId;
        const input = args.input;

        if (!skillId || typeof skillId !== 'string') {
            return { output: 'Error: skillId is required and must be a string', isError: true };
        }

        if (!input || typeof input !== 'string') {
            return { output: 'Error: input is required and must be a string', isError: true };
        }

        const skillsManager = this.getSkillsManager();
        if (!skillsManager) {
            return { output: 'Error: SkillsManager not initialized', isError: true };
        }

        try {
            console.log(`[SkillTool] Executing skill "${skillId}" with input: ${input.slice(0, 100)}...`);
            const output = await skillsManager.run(skillId, input);
            console.log(`[SkillTool] Skill "${skillId}" executed successfully. Output: ${output.slice(0, 200)}...`);
            return { output };
        } catch (error: any) {
            console.error(`[SkillTool] Skill "${skillId}" failed:`, error);
            return { output: `Error executing skill "${skillId}": ${error.message}`, isError: true };
        }
    }
}
