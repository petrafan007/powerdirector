// AUTOMATICALLY GENERATED Documentation Component for approvals
import React from 'react';

const APPROVALS_CONFIGS = [
    {
        path: 'approvals.exec',
        label: 'Exec',
        type: 'object',
        description: 'Complex Enterprise routing matrix dictating exactly who holds the mathematical cryptographic keys mathematically required to unfreeze an Agent attempting to perform a dangerous action.'
    },
    {
        path: 'approvals.exec.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle activating the interactive Wait State interrupt pipeline. If `false`, agents simply execute tasks asynchronously or fail immediately depending on hardcoded tool restrictions.'
    },
    {
        path: 'approvals.exec.mode',
        label: 'Mode',
        type: 'string',
        description: 'Defines the notification protocol (e.g. `slack_interactive_block` or `dashboard_alert`) determining exactly *how* the human administrator gets pinged to press the "Approve" button.'
    },
    {
        path: 'approvals.exec.agentFilter',
        label: 'Agent Filter',
        type: 'array',
        description: 'Regex or String lists targeting specific internal Agent Profiles. Allows bounding rules like "Only require manual approval when the Junior Agent tries to write a file, let the Senior Agent auto-execute."'
    },
    {
        path: 'approvals.exec.sessionFilter',
        label: 'Session Filter',
        type: 'array',
        description: 'Constricts approvals explicitly to designated interactive threading instances.'
    },
    {
        path: 'approvals.exec.targets',
        label: 'Targets',
        type: 'array',
        description: 'Massive routing array declaring explicitly *where* and *to whom* the PowerDirector Gateway pushes the cryptographic Approval Request payload.'
    },
    {
        path: 'approvals.exec.targets[].channel',
        label: 'Channel',
        type: 'string',
        description: 'The distinct logical Gateway name (e.g. `slack_prod` or `discord_admin_bot`) that inherently knows how to mathematically format the interactive UI buttons for the target platform.'
    },
    {
        path: 'approvals.exec.targets[].to',
        label: 'To',
        type: 'string',
        description: 'Literal routing identifier. Can be a `#channel-name`, a `@user-id`, or a `phoneNumber` depending on the channel type.'
    },
    {
        path: 'approvals.exec.targets[].accountId',
        label: 'Account Id',
        type: 'string',
        description: 'Failsafe mapping binding the outbound ping specifically to the exact user UUID who instantiated the PowerDirector gateway.'
    },
    {
        path: 'approvals.exec.targets[].threadId',
        label: 'Thread Id',
        type: 'string',
        description: 'Optionally constricts the interactive approval block forcefully into the exact threaded reply chain where the Agent originated the action, rather than dumping it into the main channel.'
    }
];

export default function ApprovalsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Execution Wait States Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep architecture routing for Human-in-the-Loop interventions. Governs the exact parameters dictating how agents pause, format cryptographic request blocks, and ping human administrators for permission to perform lethal commands like database mutations.</p>
            </div>
            <div className="space-y-6">
                {APPROVALS_CONFIGS.map((config) => (
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
