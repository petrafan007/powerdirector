// AUTOMATICALLY GENERATED Documentation Component for skills
import React from 'react';

const SKILLS_CONFIGS = [
    {
        path: 'skills.allowBundled',
        label: 'Allow Bundled',
        type: 'boolean',
        description: 'Toggles the ingestion of the default "Core" PowerDirector capability bundles shipped natively within the codebase repository (such as the standard generic `fs.read` wrapper or the naive `run_command` logic). Disabling this forces the server to strictly load ONLY manually curated custom enterprise skills mapping to absolute paths.'
    },
    {
        path: 'skills.load',
        label: 'Load',
        type: 'object',
        description: 'Defines the system-level boundaries determining where and how the gateway engine searches the physical server filesystem for external `node_modules` or `.js` capability plugins during boot.'
    },
    {
        path: 'skills.load.extraDirs',
        label: 'Extra Dirs',
        type: 'array',
        description: 'An array of absolute or relative string paths (e.g. `["/opt/powerdirector/shared_skills"]`) that the internal dynamically scoped module resolver scans when looking for custom `.js` or `.ts` skill definition descriptors to inject into the LLM context.'
    },
    {
        path: 'skills.load.watch',
        label: 'Watch',
        type: 'boolean',
        description: 'If `true`, the Node engine attaches native `fs.watch` event listeners across all directories mapped in `extraDirs`. If a developer saves a modification to a custom skill file, the engine hot-reloads the schema directly into the active LLM context seamlessly without requiring a physical gateway server restart.'
    },
    {
        path: 'skills.load.watchDebounceMs',
        label: 'Watch Debounce Ms',
        type: 'number',
        description: 'A performance and safety throttle preventing violent hot-reloading loops. If a script compiler (like `tsc`) writes multiple rapid filesystem events to a custom Skill file over 100 milliseconds, this timer aggregates the pushes and only hot-reloads the LLM schema once.'
    },
    {
        path: 'skills.install',
        label: 'Install',
        type: 'object',
        description: 'Autonomic configuration. Advanced Custom Skills often require external Unix dependencies (like `ffmpeg`, `nmap` or `jq`) to physically function natively against the host OS layer.'
    },
    {
        path: 'skills.install.preferBrew',
        label: 'Prefer Brew',
        type: 'boolean',
        description: 'For MacOS or Linux environments where multiple package architectures exist natively, `true` forcefully prioritizes utilizing Homebrew (`brew install`) over Debian/Ubuntu `apt-get` routines when dynamically acquiring missing skill dependencies.'
    },
    {
        path: 'skills.install.nodeManager',
        label: 'Node Manager',
        type: 'Enum: npm | yarn | pnpm | bun | none',
        description: 'Selects the exact native subshell execution binary the Agent engine wields when an external custom Skill forces a JavaScript dependency installation matrix during its internal initialization (e.g., executing `pnpm install` invisibly instead of standard `npm install`).'
    },
    {
        path: 'skills.entries',
        label: 'Entries',
        type: 'array',
        description: 'Explicit list of specific Skill Names (e.g. `github-pr-reviewer` or `aws-ec2-admin`) mapped directly from `extraDirs` that the server should eagerly initialize, compile, and broadcast to the agents actively residing within the PowerDirector cluster.'
    }
];

export default function SkillsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Tool Integrations (Skills) Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Core settings managing exactly how PowerDirector dynamically locates, compiles, and globally initializes third-party plugin capabilities (Skills) to expand the natural capabilities of your LLM agents.</p>
            </div>
            <div className="space-y-6">
                {SKILLS_CONFIGS.map((config) => (
                    <div key={config.path} id={config.path} className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                        <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{config.label}</h3>
                        <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Path: <span className="text-[var(--pd-text-main)] font-semibold">{config.path}</span>
                            </span>
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Type: <span className="text-[var(--pd-text-main)] font-semibold">{config.type}</span>
                            </span>
                        </div>
                        <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                            <p>{config.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
