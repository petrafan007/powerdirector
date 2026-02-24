// AUTOMATICALLY GENERATED Documentation Component for canvasHost
import React from 'react';

const CANVASHOST_CONFIGS = [
    {
        path: 'canvasHost.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the embedded micro-webserver dedicated exclusively to serving static React \'Canvas\' artifacts. If `false`, agents cannot physically render interactive React components inside chat threads.'
    },
    {
        path: 'canvasHost.root',
        label: 'Root',
        type: 'string',
        description: 'Absolute Linux directory path where PowerDirector compiles and serves user-generated or Agent-generated interactive Canvas mini-apps.'
    },
    {
        path: 'canvasHost.port',
        label: 'Port',
        type: 'number',
        description: 'The distinct internal HTTP port (e.g. `8081`) where the Canvas micro-server binds. This physically routes static bundle requests around the primary PowerDirector GraphQL/WebSocket API running on `8080`, preventing asset serving from blocking LLM streams.'
    },
    {
        path: 'canvasHost.liveReload',
        label: 'Live Reload',
        type: 'boolean',
        description: 'Developer Experience (DX) parameter. If `true`, the Canvas micro-server injects a WebSocket hot-reload script into compiled bundles, meaning as an Agent physically edits a React component file on disk, the UI instantly refreshes the user\'s screen.'
    }
];

export default function CanvasHostConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Canvas UI Rendering Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Microservice tooling. PowerDirector spawns a dedicated HTTP interface specifically to serve dynamically generated React components (Canvases) so that UI rendering doesn\'t block primary WebSocket message processing.</p>
            </div>
            <div className="space-y-6">
                {CANVASHOST_CONFIGS.map((config) => (
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
