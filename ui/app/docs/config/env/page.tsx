// AUTOMATICALLY GENERATED Documentation Component for env
import React from 'react';

export default function EnvConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">{`Environment Configuration`}</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">{`The Environment module configures low-level system variables, custom execution environments, and native shell behaviors. As a PowerDirector administrator, you'll use this section to set explicit overrides for shell sessions and inject predefined variables into your AI workers' execution contexts. Misconfiguration here can lead to security vulnerabilities or execution timeouts.`}</p>
            </div>
            <div className="space-y-6">
                <div id="env.shellEnv" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Shell Env`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`env.shellEnv`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`object`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>This root object configures how PowerDirector instances interact with the underlying host operating system's native shell. When AI agents execute bash commands or run scripts, they do so within the bounds established here. Adjusting these settings impacts the isolation and operational limits of system-level execution.</p>
                    </div>
                </div>
                <div id="env.shellEnv.enabled" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Shell Env Enabled`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`env.shellEnv.enabled`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`boolean`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>A crucial binary switch that globally permits or denies AI agents from interfacing with the host OS shell. If set to <code>false</code>, all native command execution capabilities (like running `ls` or launching python scripts) are strictly prohibited, creating a highly sandboxed environment at the cost of utility. Strongly consider setting this to <code>false</code> if your instance is internet-facing and lacks secondary containerization layers.</p>
                    </div>
                </div>
                <div id="env.shellEnv.timeoutMs" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Shell Env Timeout Ms`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`env.shellEnv.timeoutMs`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`number`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>Defines the absolute execution time limit (in milliseconds) for any given shell command spawned by PowerDirector. If a process exceeds this threshold (e.g., hanging on a network request, endless loop), the Orchestration Engine will send a SIGKILL to terminate the child process to prevent thread starvation. Standard default is 30,000ms (30 seconds).</p>
                    </div>
                </div>
                <div id="env.vars" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Environment Variables`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`env.vars`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`record`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>A dictionary object representing predefined variables injected directly into the Node.js <code>process.env</code> scope upon initialization. Keys defined here will overwrite existing standard OS environment variables for the internal application runtime. This is generally utilized by plugin managers to inject specific keys seamlessly.</p>
                    </div>
                </div>
                <div id="env.customEnvVars" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Custom Env Vars`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`env.customEnvVars`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`record`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>User-defined key/value pairs that are specifically exposed to the language model context (unlike the <code>env.vars</code> path which is strictly internal). If an Agent needs to know an API key to complete a user task, place it here in the custom vars record. <strong>Warning:</strong> Variables populated here will be visible to the LLM agent and any shell scripts it executes.</p>
                    </div>
                </div>
                <div id="env.dotenvPath" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Dotenv Path`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`env.dotenvPath`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`string`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>The explicit absolute or relative filesystem path to the <code>.env</code> file utilized for bootstrapping your PowerDirector instance. If omitted, the system falls back to resolving <code>.env</code> in the current working directory of the node process. Modify this if you organize keys centrally (e.g. <code>/etc/powerdirector/.env</code>).</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
