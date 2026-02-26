import React from 'react';

export default function BindingsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Channel-to-Agent Logic Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">This section governs the explicit mapping links between physical external Chat interfaces (like a specific Slack channel) and the internal Agent Engine that responds to it.</p>
                <p className="text-[var(--pd-text-muted)] text-md leading-relaxed mt-4">
                    Note: Bindings are primarily managed holistically through the Web UI database or dynamically learned at runtime rather than via hardcoded primitive YAML integers. As such, there are no static file-level properties exposed in this specific configuration block.
                </p>
            </div>
            <div className="space-y-6">
                <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm italic text-[var(--pd-text-muted)]">
                    No static configuration properties defined for this section. See the Database bindings table for real-time agent mapping allocations.
                </div>
            </div>
        </div>
    );
}
