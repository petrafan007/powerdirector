// AUTOMATICALLY GENERATED Documentation Component for media
import React from 'react';

const MEDIA_CONFIGS = [
    {
        path: 'media.preserveFilenames',
        label: 'Preserve Filenames',
        type: 'boolean',
        description: 'If `true`, PowerDirector retains original client upload filenames (e.g. `Q3_Financials.pdf`) on the host disk instead of aggressively hashing them into UUIDs (`8f2a-4b1...pdf`). Crucial for Agents trying to natively navigate the local filesystem.'
    },
    {
        path: 'media.imageGeneration',
        label: 'Image Generation',
        type: 'object',
        description: 'Settings explicitly governing the outbound \'Generate Image\' tool pipelines, distinct from the inbound \'Ingest Image\' toolchain defined in `tools.media`.'
    },
    {
        path: 'media.imageGeneration.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the Agent\'s innate ability to draw pictures.'
    },
    {
        path: 'media.imageGeneration.provider',
        label: 'Provider',
        type: 'Enum: openai | stability | midjourney | local',
        description: 'Selects the specific API backend routing the drawing calls. `openai` maps to DALL-E 3.'
    },
    {
        path: 'media.imageGeneration.model',
        label: 'Model',
        type: 'string',
        description: 'Specific physical model version string (e.g. `dall-e-3` or `stable-diffusion-xl`).'
    },
    {
        path: 'media.imageGeneration.defaultSize',
        label: 'Default Size',
        type: 'string',
        description: 'Resolution mapping injected if the Agent doesn\'t explicitly specify dimensions (e.g., `1024x1024`).'
    },
    {
        path: 'media.maxUploadSize',
        label: 'Max Upload Size',
        type: 'number',
        description: 'Hard HTTP payload byte limit rejecting incoming WebSocket or REST requests containing absolutely massive files before they physically buffer into Node.js RAM.'
    },
    {
        path: 'media.allowedMimeTypes',
        label: 'Allowed Mime Types',
        type: 'array',
        description: 'Whitelist matrix rejecting dangerous uploads (like `.sh` scripts) while only permitting expected media structures (e.g. `image/png`, `application/pdf`).'
    },
    {
        path: 'media.storageDir',
        label: 'Storage Dir',
        type: 'string',
        description: 'Absolute Linux directory path where PowerDirector indefinitely persists all incoming uploads and generated images.'
    }
];

export default function MediaConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">File Attachment Processing Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Host-level parameters dictating file persistence logic. Governs where documents are saved, upload ceilings, and outbound image generation toolchains.</p>
            </div>
            <div className="space-y-6">
                {MEDIA_CONFIGS.map((config) => (
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
