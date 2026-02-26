// AUTOMATICALLY GENERATED Documentation Component for nodeHost
import React from 'react';

const NODEHOST_CONFIGS = [
    {
        path: 'nodeHost.browserProxy',
        label: 'Browser Proxy',
        type: 'object',
        description: 'Native clustering controls for Enterprise scale. Dictates how this specific PowerDirector Node interacts with massive remote Headless Browser farms.'
    },
    {
        path: 'nodeHost.browserProxy.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'If `true`, this PowerDirector Node physically transforms into a "Browser Worker." It stops acting as a normal LLM Router and instead purely dedicates its CPU/RAM to holding open WebSocket streams for remote Agents to execute Puppeteer commands against.'
    },
    {
        path: 'nodeHost.browserProxy.allowProfiles',
        label: 'Allow Profiles',
        type: 'array',
        description: 'Security boundary. explicitly defines which literal Chromium `user-data-dir` profiles this Worker node is legally allowed to boot up on behalf of remote master Agents sending WebSocket commands.'
    }
];

export default function NodeHostConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Compute Worker Environment Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Advanced scaling configuration permitting a PowerDirector node to entirely reinvent its runtime purpose, acting as a dedicated cluster worker for intensive operations like Headless Browser automation instead of traditional LLM orchestration.</p>
            </div>
            <div className="space-y-6">
                {NODEHOST_CONFIGS.map((config) => (
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
