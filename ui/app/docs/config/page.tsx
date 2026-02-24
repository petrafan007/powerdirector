import React from 'react';
import Link from 'next/link';

export default function ConfigDocsIndex() {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Configuration Guide</h1>
            <p className="lead">
                The PowerDirector Config system is the centralized source of truth for the entire application environment. It dictates how components behave, connect, and interact.
            </p>

            <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl mt-8">
                <h2 className="mt-0 text-xl font-semibold mb-4 border-b border-[var(--pd-border)] pb-2">Core Settings</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Link href="/docs/config/env" className="text-blue-400 hover:text-blue-300">Environment</Link>
                    <Link href="/docs/config/auth" className="text-blue-400 hover:text-blue-300">Authentication</Link>
                    <Link href="/docs/config/agents" className="text-blue-400 hover:text-blue-300">Agents</Link>
                    <Link href="/docs/config/channels" className="text-blue-400 hover:text-blue-300">Channels</Link>
                    <Link href="/docs/config/messages" className="text-blue-400 hover:text-blue-300">Messages</Link>
                    <Link href="/docs/config/commands" className="text-blue-400 hover:text-blue-300">Commands</Link>
                    <Link href="/docs/config/skills" className="text-blue-400 hover:text-blue-300">Skills</Link>
                </div>
            </div>

            <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl mt-6">
                <h2 className="mt-0 text-xl font-semibold mb-4 border-b border-[var(--pd-border)] pb-2">Infrastructure & System</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Link href="/docs/config/gateway" className="text-emerald-400 hover:text-emerald-300">Gateway</Link>
                    <Link href="/docs/config/models" className="text-emerald-400 hover:text-emerald-300">Models</Link>
                    <Link href="/docs/config/diagnostics" className="text-emerald-400 hover:text-emerald-300">Diagnostics</Link>
                    <Link href="/docs/config/logging" className="text-emerald-400 hover:text-emerald-300">Logging</Link>
                    <Link href="/docs/config/browser" className="text-emerald-400 hover:text-emerald-300">Browser</Link>
                    <Link href="/docs/config/ui" className="text-emerald-400 hover:text-emerald-300">UI</Link>
                    <Link href="/docs/config/bindings" className="text-emerald-400 hover:text-emerald-300">Bindings</Link>
                </div>
            </div>

            <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl mt-6">
                <h2 className="mt-0 text-xl font-semibold mb-4 border-b border-[var(--pd-border)] pb-2">Advanced Management</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Link href="/docs/config/session" className="text-purple-400 hover:text-purple-300">Session</Link>
                    <Link href="/docs/config/cron" className="text-purple-400 hover:text-purple-300">Cron Jobs</Link>
                    <Link href="/docs/config/web" className="text-purple-400 hover:text-purple-300">Web Runtime</Link>
                    <Link href="/docs/config/discovery" className="text-purple-400 hover:text-purple-300">Discovery</Link>
                    <Link href="/docs/config/memory" className="text-purple-400 hover:text-purple-300">Vector Memory</Link>
                    <Link href="/docs/config/plugins" className="text-purple-400 hover:text-purple-300">Plugins</Link>
                    <Link href="/docs/config/approvals" className="text-purple-400 hover:text-purple-300">Approvals</Link>
                </div>
            </div>

            <h2 className="mt-12">How Config is Stored</h2>
            <p>
                When you make a change in the UI, the state is persisted dynamically via the Gateway to the central `powerdirector.config.json` file.
                In distributed architectures with multiple <em>Nodes</em>, settings seamlessly sync so behavior is unified across the cluster.
            </p>
        </div>
    );
}
