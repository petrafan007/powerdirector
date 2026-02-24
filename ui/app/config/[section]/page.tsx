'use client';

import { use, useEffect, useState } from 'react';
import SettingsForm from '../../components/config/SettingsForm';
import ConfigSectionRenderer from '../../components/config/ConfigSectionRenderer';
import { useSettings } from '../SettingsContext';

const SECTION_META: Record<string, { title: string; description: string }> = {
    env: { title: 'Environment', description: 'PowerDirector env configuration, including shell timeout and env vars' },
    wizard: { title: 'Setup Wizard', description: 'Setup wizard metadata' },
    update: { title: 'Updates', description: 'Release channel and startup checks' },
    auth: { title: 'Authentication', description: 'Auth profiles, order, and cooldowns' },
    agents: { title: 'Agents', description: 'Agent defaults, runtime behavior, and per-agent overrides' },
    channels: { title: 'Channels', description: 'Channel/provider configuration map' },
    messages: { title: 'Messages', description: 'Prefixes, queueing, inbound debounce, reactions, and TTS' },
    commands: { title: 'Commands', description: 'Native/bash/text command controls and access rules' },
    terminal: { title: 'Terminal', description: 'PowerDirector terminal runtime settings' },
    hooks: { title: 'Hooks', description: 'External/internal hooks, mappings, Gmail, and security controls' },
    skills: { title: 'Skills', description: 'Bundled allowlist, load/install settings, and per-skill entries' },
    tools: { title: 'Tools', description: 'PowerDirector tool policy, provider policy, and tool subsystem config' },
    gateway: { title: 'Gateway', description: 'Gateway network/auth/tls/reload/remote/http/nodes settings' },
    meta: { title: 'Meta', description: 'Config metadata' },
    diagnostics: { title: 'Diagnostics', description: 'Flags, cache tracing, and OpenTelemetry' },
    logging: { title: 'Logging', description: 'Log levels and redaction controls' },
    browser: { title: 'Browser', description: 'CDP and profile controls' },
    ui: { title: 'UI', description: 'Assistant identity and UI presentation settings' },
    models: { title: 'Models', description: 'Model mode/providers and Bedrock discovery' },
    nodeHost: { title: 'Node Host', description: 'Node host and browser proxy settings' },
    bindings: { title: 'Bindings', description: 'PowerDirector binding rules' },
    broadcast: { title: 'Broadcast', description: 'Broadcast strategy and peer mappings' },
    audio: { title: 'Audio', description: 'Legacy transcription compatibility settings' },
    media: { title: 'Media', description: 'Media filename preservation and upload/image compatibility settings' },
    approvals: { title: 'Approvals', description: 'Exec approval forwarding configuration' },
    session: { title: 'Session', description: 'Session scope/reset/maintenance/send policy configuration' },
    cron: { title: 'Cron Jobs', description: 'Cron runtime and retention settings' },
    web: { title: 'Web', description: 'Web runtime heartbeat and reconnect behavior' },
    discovery: { title: 'Discovery', description: 'Wide-area and mDNS discovery controls' },
    canvasHost: { title: 'Canvas Host', description: 'Canvas host root/port/live reload settings' },
    talk: { title: 'Talk', description: 'Voice ID/aliases/output/interrupt controls' },
    memory: { title: 'Memory', description: 'Memory backend, citation mode, and QMD settings' },
    plugins: { title: 'Plugins', description: 'Plugin allow/deny/load/slots/entries/install records' },
};

export default function SectionPage({ params }: { params: Promise<{ section: string }> }) {
    const { section } = use(params);
    const { fullSchema, loading } = useSettings();
    const meta = SECTION_META[section];
    const [sectionSchema, setSectionSchema] = useState<any>(null);
    const [schemaLoading, setSchemaLoading] = useState(false);
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const schema = sectionSchema ?? fullSchema[section] ?? null;

    useEffect(() => {
        let cancelled = false;
        if (!section) return;
        const cachedSchema = fullSchema[section] ?? null;
        setSectionSchema(cachedSchema);

        // Always fetch section schema from API to pick up dynamic manifests
        // (plugin/channel config schemas) even when a cached schema exists.
        const loadSectionSchema = async () => {
            setSchemaLoading(true);
            setSchemaError(null);
            try {
                const res = await fetch(`/api/config/schema/${section}`, { cache: 'no-store' });
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json?.schema) {
                    throw new Error(json?.error || `Failed to load schema for ${section}`);
                }
                if (!cancelled) {
                    setSectionSchema(json.schema);
                }
            } catch (error: any) {
                if (!cancelled) {
                    setSchemaError(error?.message || 'Schema unavailable');
                    // Keep cached schema if present; only clear when no fallback exists.
                    if (!cachedSchema) {
                        setSectionSchema(null);
                    }
                }
            } finally {
                if (!cancelled) {
                    setSchemaLoading(false);
                }
            }
        };

        void loadSectionSchema();
        return () => {
            cancelled = true;
        };
    }, [section, fullSchema]);

    if (!meta) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <div className="text-lg font-medium">Unknown Section</div>
                    <div className="text-sm mt-1">&quot;{section}&quot; is not a valid config section.</div>
                </div>
            </div>
        );
    }

    return (
        <SettingsForm section={section} title={meta.title} description={meta.description}>
            {(data, update) => {
                if (!schema) {
                    return (
                        <div className="py-8 text-center text-sm opacity-60">
                            {(loading || schemaLoading) ? 'Loading schema...' : (schemaError || 'Schema unavailable')}
                        </div>
                    );
                }
                return (
                    <ConfigSectionRenderer
                        sectionId={section}
                        schema={schema}
                        data={data}
                        onUpdate={update}
                    />
                );
            }}
        </SettingsForm>
    );
}
