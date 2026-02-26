// AUTOMATICALLY GENERATED Documentation Component for commands
import React from 'react';

const COMMANDS_CONFIGS = [
    {
        path: 'commands.native',
        label: 'Native',
        type: 'boolean',
        description: 'Master toggle permitting the AI Agent engine to intercept incoming strings that begin with a `/` slash prefix (e.g. `/ping`, `/help`) and route them directly to hardcoded internal macro functions rather than dispatching them to the expensive LLM architecture.'
    },
    {
        path: 'commands.nativeSkills',
        label: 'Native Skills',
        type: 'array',
        description: 'An explicit array of strings defining which exact Skills or Toolchains bypass natural language interpretation entirely. When listed here, users can trigger tools via rigid syntax like `/skill run [name]` instead of vaguely asking the LLM to do it.'
    },
    {
        path: 'commands.text',
        label: 'Text',
        type: 'boolean',
        description: 'Enables a legacy debugging handler that forces the PowerDirector gateway to parse and emit raw, unformatted AST text blobs directly back to the requesting client. Useful during development to bypass complex Markdown or Adaptive Card formatters.'
    },
    {
        path: 'commands.bash',
        label: 'Bash',
        type: 'boolean',
        description: 'Extremely dangerous capability toggle. If `true`, authorized administrators can directly send raw Linux shell commands (e.g. `/bash ls -la /`) into the chat GUI and PowerDirector will execute them natively on the host server OS without any Docker isolation.'
    },
    {
        path: 'commands.bashForegroundMs',
        label: 'Bash Foreground Ms',
        type: 'number',
        description: 'When a `/bash` command is executed, this defines the maximum millisecond threshold the gateway will block the UI thread waiting for the Unix process to exit natively. If it takes longer than this (e.g. compiling a binary), the system automatically detaches it into a background asynchronous worker.'
    },
    {
        path: 'commands.config',
        label: 'Config',
        type: 'boolean',
        description: 'Authorizes the vital `/config` slash command suite, permitting remote users to inspect, modify, and reload the core `powerdirector.yaml` runtime schema dynamically through their chat interface without needing SSH access.'
    },
    {
        path: 'commands.debug',
        label: 'Debug',
        type: 'boolean',
        description: 'Permits the `/debug` routing namespace. This allows power users to dump active memory vectors, inspect raw LLM conversational token histories, and trigger aggressive system garbage collection sweeps from the chat UI.'
    },
    {
        path: 'commands.restart',
        label: 'Restart',
        type: 'boolean',
        description: 'Grants access to the `/restart` primitive. If triggered, PowerDirector will intentionally exit its primary Node process (Status 0). This assumes a supervisor like `systemd` or `pm2` is actively watching the PID to immediately spawn a fresh instance.'
    },
    {
        path: 'commands.useAccessGroups',
        label: 'Use Access Groups',
        type: 'boolean',
        description: 'If `true`, command permissions are decoupled from raw User IDs and instead evaluated against Role-Based Access Control (RBAC) matrices defined elsewhere in the security schema (e.g. granting access strictly to the `developers` group).'
    },
    {
        path: 'commands.ownerAllowFrom',
        label: 'Owner Allow From',
        type: 'array',
        description: 'The absolute highest tier of security enforcement. Arrays of strings here act as "God Mode" mappings. Any UUID or Email matching this list bypasses all channel blocks, DM policies, and rate limits globally.'
    },
    {
        path: 'commands.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'A standard whitelist defining the exact UUIDs, Usernames, or Phone Numbers legally permitted to utilize any of the Slash Commands configured above. Requests from unrecognized origins are silently dropped.'
    }
];

export default function CommandsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Commands Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep constraints managing explicit slash-command routing, defining how raw terminal operations and core administration directives are intercepted before hitting the AI execution layer.</p>
            </div>
            <div className="space-y-6">
                {COMMANDS_CONFIGS.map((config) => (
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
