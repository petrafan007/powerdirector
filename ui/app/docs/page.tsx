import React from 'react';
import Link from 'next/link';

export default function DocsIndex() {
    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">PowerDirector Documentation</h1>
            <p className="text-lg text-[var(--pd-text-muted)]">
                Welcome to the comprehensive documentation for PowerDirector. Here you will find everything you need to understand, configure, and manage your AI orchestration environment.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 rounded-xl border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] hover:border-blue-500/50 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
                    <p className="text-[var(--pd-text-muted)] mb-4">Learn the basics of PowerDirector, its architecture, and how to navigate the UI.</p>
                    <Link href="/docs/overview" className="text-blue-400 hover:text-blue-300 font-medium">Read Overview &rarr;</Link>
                </div>

                <div className="p-6 rounded-xl border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] hover:border-emerald-500/50 transition-colors">
                    <h2 className="text-xl font-semibold mb-2">Configuration</h2>
                    <p className="text-[var(--pd-text-muted)] mb-4">Deep dive into every setting, environment variable, and system parameter.</p>
                    <Link href="/docs/config" className="text-emerald-400 hover:text-emerald-300 font-medium">View Config Docs &rarr;</Link>
                </div>
            </div>

            <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-[var(--pd-border)] pb-2">Core Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { name: 'Agents', path: '/docs/agents', desc: 'Manage your AI assistants and their models.' },
                    { name: 'Channels', path: '/docs/channels', desc: 'Connect to external platforms like Discord.' },
                    { name: 'Skills', path: '/docs/skills', desc: 'Extend agent capabilities with installable packages.' },
                    { name: 'Instances', path: '/docs/instances', desc: 'Monitor distributed PowerDirector nodes.' },
                    { name: 'Sessions', path: '/docs/sessions', desc: 'Review chat transcripts and context memory.' },
                    { name: 'Cron Jobs', path: '/docs/cron', desc: 'Schedule automated tasks and agent actions.' }
                ].map(item => (
                    <Link key={item.path} href={item.path} className="p-4 rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] hover:bg-[var(--pd-surface-hover)] transition-all">
                        <h3 className="font-medium text-[var(--pd-text-main)]">{item.name}</h3>
                        <p className="text-sm text-[var(--pd-text-muted)] mt-1">{item.desc}</p>
                    </Link>
                ))}
            </div>

            <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-[var(--pd-border)] pb-2">System & Diagnostics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { name: 'Nodes', path: '/docs/nodes', desc: 'Advanced routing and peer discovery.' },
                    { name: 'Debug', path: '/docs/debug', desc: 'System inspection and cache management.' },
                    { name: 'Logs', path: '/docs/logs', desc: 'Live system logging and historical events.' },
                    { name: 'Usage', path: '/docs/usage', desc: 'Track token utilization and costs.' }
                ].map(item => (
                    <Link key={item.path} href={item.path} className="p-4 rounded-lg border border-[var(--pd-border)] bg-[var(--pd-surface-panel)] hover:bg-[var(--pd-surface-hover)] transition-all">
                        <h3 className="font-medium text-[var(--pd-text-main)]">{item.name}</h3>
                        <p className="text-sm text-[var(--pd-text-muted)] mt-1">{item.desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
