// @ts-nocheck
export type SkillEnvVar = {
    name: string;
    description?: string;
    required?: boolean;
    default?: string;
};

export type Skill = {
    name: string;
    description?: string;
    baseDir: string;
    filePath: string;
    env?: SkillEnvVar[];
    frontmatter?: ParsedSkillFrontmatter;
};

export interface SkillUsageExample {
    description: string;
    input: string;
}

export interface ParsedSkillFrontmatter {
    name?: string;
    description?: string;
    env?: Record<string, string>;
    "command-dispatch"?: string;
    "command_dispatch"?: string;
    "command-tool"?: string;
    "command_tool"?: string;
    "command-arg-mode"?: string;
    "command_arg_mode"?: string;
    metadata?: {
        powerdirector?: {
            emoji?: string;
            os?: string[];
            requires?: {
                bins?: string[];
                env?: string[];
            };
            primaryEnv?: string;
            install?: Array<{
                id: string;
                kind: string;
                formula?: string;
                module?: string;
                bins?: string[];
                label?: string;
            }>;
        };
    };
    [key: string]: unknown;
}

export interface PowerDirectorSkillMetadata {
    primaryEnv?: string;
}

export interface SkillInvocationPolicy {
    userInvocable?: boolean;
    disableModelInvocation?: boolean;
}

export interface SkillEligibilityContext {
    remote?: {
        note?: string;
    };
    [key: string]: any;
}

export interface SkillEntry {
    skill: Skill;
    frontmatter?: ParsedSkillFrontmatter;
    metadata?: PowerDirectorSkillMetadata;
    invocation?: SkillInvocationPolicy;
    enabled?: boolean;
    config?: Record<string, any>;
    apiKey?: string;
}

export interface SkillSnapshot {
    prompt: string;
    skills: { name: string; primaryEnv?: string }[];
    resolvedSkills: Skill[];
    version?: number;
}

export interface SkillCommandSpec {
    name: string;
    skillName: string;
    description: string;
    dispatch?: {
        kind: 'tool';
        toolName: string;
        argMode: 'raw' | 'json';
    };
}
