'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    isCurrentWizardVersion,
    parseForceRunFlag,
    parseWizardMeta,
    shouldAutoSkipWizard,
    type WizardRunMeta
} from '../../lib/wizard-flow';

// ═══════════════════════════════════════════════════════════
// WIZARD STEPS
// ═══════════════════════════════════════════════════════════

interface WizardData {
    // Step 0: Welcome
    // Step 1: Usage Mode
    usageMode: 'standalone' | 'remote';
    // Step 2: Model Provider
    provider: string;
    apiKey: string;
    // Step 3: Model Selection
    model: string;
    // Step 4: Agent Defaults
    workspace: string;
    timeoutSeconds: string;
    compactionMode: string;
    // Step 5: Features
    webSearchEnabled: boolean;
    webSearchProvider: string;
    webSearchApiKey: string;
    ttsEnabled: boolean;
    ttsProvider: string;
    // Step 6: Gateway (Server config for Standalone / Client config for Remote)
    gatewayPort: string;
    gatewayBind: string;
    remoteGatewayUrl: string;
    remoteGatewayToken: string;
    // Step 7: Channels
    discordToken: string;
    telegramToken: string;
    slackToken: string;
    // UI Features
    maxChatTabs: number;
    // Terminal Features
    terminalPort: string;
    terminalBind: string;
}

const DEFAULT_DATA: WizardData = {
    usageMode: 'standalone',
    provider: 'anthropic',
    apiKey: '',
    model: '',
    workspace: '',
    timeoutSeconds: '180',
    compactionMode: 'safeguard',
    webSearchEnabled: true,
    webSearchProvider: 'brave',
    webSearchApiKey: '',
    ttsEnabled: false,
    ttsProvider: 'elevenlabs',
    gatewayPort: '3007',
    gatewayBind: 'lan',
    remoteGatewayUrl: '',
    remoteGatewayToken: '',
    discordToken: '',
    telegramToken: '',
    slackToken: '',
    maxChatTabs: 5,
    terminalPort: '3008',
    terminalBind: 'lan',
};

interface ProviderDef {
    id: string;
    name: string;
    icon: string;
    models: string[];
    description: string;
    authType?: 'key' | 'cli'; // 'cli' = authorize button, 'key' = API key input (default)
    api?: string;
    baseUrl?: string;
}

const PROVIDERS: ProviderDef[] = [
    { id: 'anthropic', name: 'Anthropic', icon: '🟣', models: ['claude-opus-4.6', 'claude-opus-4.5', 'claude-sonnet-4', 'claude-haiku-4'], description: 'Claude models — best for coding and reasoning', api: 'anthropic-messages', baseUrl: 'https://api.anthropic.com' },
    { id: 'openai', name: 'OpenAI', icon: '🟢', models: ['gpt-5.3-codex', 'gpt-5.2-codex', 'gpt-5.1-codex-max', 'gpt-5', 'gpt-4.1'], description: 'GPT models — versatile and widely supported', api: 'openai-responses', baseUrl: 'https://api.openai.com/v1' },
    { id: 'gemini', name: 'Google Gemini', icon: '🔵', models: ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'], description: 'Gemini REST API — great multimodal capabilities', api: 'google-generative-ai', baseUrl: 'https://generativelanguage.googleapis.com' },
    { id: 'google-gemini-cli', name: 'Gemini CLI', icon: '🔵', models: ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'], description: 'Headless Gemini CLI — authorize your Google account', authType: 'cli', api: 'google-generative-ai', baseUrl: 'https://generativelanguage.googleapis.com' },
    { id: 'openai-codex', name: 'Codex CLI', icon: '🟢', models: ['gpt-5.3-codex', 'gpt-5.2-codex', 'gpt-5.1-codex-max'], description: 'OpenAI Codex CLI — unrestricted/full-auto mode', authType: 'cli', api: 'openai-responses', baseUrl: 'https://api.openai.com/v1' },
    { id: 'grok', name: 'xAI Grok', icon: '⚫', models: ['grok-4.1', 'grok-4.1-fast', 'grok-4'], description: 'Grok models — real-time knowledge', api: 'openai-completions', baseUrl: 'https://api.x.ai/v1' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🟠', models: ['deepseek-v3.2', 'deepseek-r1'], description: 'DeepSeek models — cost-effective reasoning', api: 'openai-completions', baseUrl: 'https://api.deepseek.com' },
    { id: 'perplexity', name: 'Perplexity', icon: '🔮', models: ['sonar-pro', 'sonar'], description: 'Perplexity models — live web-grounded answers', api: 'openai-completions', baseUrl: 'https://api.perplexity.ai' },
    { id: 'openrouter', name: 'OpenRouter', icon: '🌈', models: [], description: 'Access any model via unified API gateway', api: 'openai-completions', baseUrl: 'https://openrouter.ai/api/v1' },
    { id: 'ollama', name: 'Ollama (Local)', icon: '🏠', models: ['llama-4', 'qwen3'], description: 'Run models locally — no API key needed', api: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
];

// Steps logic needs to be dynamic or we define strict order and skip
const STEPS = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'mode', title: 'Usage Mode' },
    { id: 'provider', title: 'Model Provider' },
    { id: 'agent', title: 'Agent Defaults' },
    { id: 'features', title: 'Features' },
    { id: 'channels', title: 'Channels' },
    { id: 'remote_config', title: 'Connection' }, // For remote mode
    { id: 'finish', title: 'All Set!' },
];

const APP_VERSION = process.env.NEXT_PUBLIC_PD_VERSION || '0.0.0';

/* ── Shared inline style helpers ── */
const inputStyle = {
    background: 'var(--pd-surface-panel)',
    border: '1px solid var(--pd-border)',
    color: 'var(--pd-text-main)',
};

const cardStyle = {
    background: 'var(--pd-surface-panel)',
    border: '1px solid var(--pd-border)',
};

function digitsOnly(value: string): string {
    return value.replace(/\D+/g, '');
}

function parseBoundedInteger(rawValue: string, field: string, min: number, max: number): number {
    const trimmed = rawValue.trim();
    if (!trimmed) {
        throw new Error(`${field} is required.`);
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        throw new Error(`${field} must be between ${min} and ${max}.`);
    }

    return parsed;
}

export default function SetupWizardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const shouldForceRun = parseForceRunFlag(searchParams.get('force'));
    const [step, setStep] = useState(0);
    const [data, setData] = useState<WizardData>(DEFAULT_DATA);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [wizardMeta, setWizardMeta] = useState<WizardRunMeta | null>(null);
    const [wizardMetaIsCurrentVersion, setWizardMetaIsCurrentVersion] = useState(false);
    const [autoSkippedToFinish, setAutoSkippedToFinish] = useState(false);

    useEffect(() => {
        loadWizardMetadata();
    }, [shouldForceRun]);

    const loadWizardMetadata = async (ignoreForceParam = false) => {
        try {
            const res = await fetch('/api/config/wizard');
            const json = await res.json();
            const parsedMeta = parseWizardMeta(json?.data);
            if (parsedMeta) {
                const currentVersion = isCurrentWizardVersion(parsedMeta, APP_VERSION);
                const effectiveForceRun = ignoreForceParam ? false : shouldForceRun;
                const shouldSkip = shouldAutoSkipWizard(parsedMeta, APP_VERSION, effectiveForceRun);

                setWizardMeta(parsedMeta);
                setWizardMetaIsCurrentVersion(currentVersion);
                setAutoSkippedToFinish(shouldSkip && !effectiveForceRun);

                if (shouldSkip && !effectiveForceRun) {
                    setStep(STEPS.length - 1);
                } else if (effectiveForceRun) {
                    setStep(0);
                    setAutoSkippedToFinish(false);
                }
            } else {
                setWizardMeta(null);
                setWizardMetaIsCurrentVersion(false);
                setAutoSkippedToFinish(false);
                setStep(0); // If no meta, always start at step 0
            }
        } catch {
            // Keep wizard usable even if metadata load fails.
        }
    };

    const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const next = () => {
        setError('');

        // Branching Logic
        if (step === 1 && data.usageMode === 'remote') {
            // If remote, skip provider(2), agent(3), features(4), channels(5)
            // Go to remote_config (6)
            setStep(6);
            return;
        }

        // If coming from remote_config (6), go to finish (7)
        if (step === 6) {
            setStep(7);
            return;
        }

        // If 'standalone' mode, skip remote_config(6) when at channels(5)
        if (step === 5 && data.usageMode === 'standalone') {
            setStep(7);
            return;
        }

        // Validation
        if (step === 2 && !data.apiKey && data.provider !== 'ollama') { // step 2 is provider now
            const selectedProv = PROVIDERS.find(p => p.id === data.provider);
            if (selectedProv?.authType !== 'cli') {
                setError('Please enter an API key to continue.');
                return;
            }
        }
        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const back = () => {
        if (step === 6) {
            // Remote config -> Back to Mode (1)
            setStep(1);
            return;
        }
        if (step === 7) { // Finish
            if (data.usageMode === 'remote') setStep(6);
            else setStep(5);
            return;
        }
        setStep(s => Math.max(s - 1, 0));
    };

    const finish = async () => {
        setSaving(true);
        setError('');
        try {
            if (data.usageMode === 'remote') {
                // Save Client Preference
                localStorage.setItem('pd_gateway_mode', 'remote');
                localStorage.setItem('pd_gateway_url', data.remoteGatewayUrl);
                localStorage.setItem('pd_gateway_token', data.remoteGatewayToken);

                // We still save wizard meta so we don't ask again
                await saveSection('wizard', {
                    lastRunAt: new Date().toISOString(),
                    lastRunVersion: APP_VERSION,
                    lastRunCommand: 'setup-wizard',
                    lastRunMode: 'remote',
                });
            } else {
                // Standalone Mode: Save all server config
                localStorage.setItem('pd_gateway_mode', 'local');
                const timeoutSeconds = parseBoundedInteger(data.timeoutSeconds, 'Timeout (seconds)', 10, 600);
                const gatewayPort = parseBoundedInteger(data.gatewayPort, 'Gateway port', 1, 65535);
                const terminalPort = parseBoundedInteger(data.terminalPort, 'Terminal port', 1, 65535);
                const normalizeBind = (value: string) => {
                    if (value === 'localhost') return 'loopback';
                    if (value === '0.0.0.0') return 'auto';
                    return value;
                };
                const gatewayBind = normalizeBind(data.gatewayBind);
                const terminalBind = normalizeBind(data.terminalBind);

                // Save model/provider config
                const selectedProvider = PROVIDERS.find(p => p.id === data.provider);
                if (selectedProvider && (data.apiKey || data.provider === 'ollama')) {
                    const existingModelsRes = await fetch('/api/config/models');
                    const existingModelsJson = await existingModelsRes.json();
                    const existingModels = existingModelsJson?.data || {};
                    const existingProviders = existingModels.providers || {};
                    const existingProvider = existingProviders[data.provider] || {};
                    const existingModelList = Array.isArray(existingProvider.models) ? existingProvider.models : [];

                    // Ensure the selected model is in the provider's model list
                    const hasModel = existingModelList.some((m: any) => m.id === data.model);
                    const updatedModels = hasModel ? existingModelList : [
                        ...existingModelList,
                        { id: data.model, name: data.model }
                    ];

                    await saveSection('models', {
                        ...existingModels,
                        providers: {
                            ...existingProviders,
                            [data.provider]: {
                                ...existingProvider,
                                name: selectedProvider.name,
                                api: selectedProvider.api || existingProvider.api,
                                baseUrl: selectedProvider.baseUrl || existingProvider.baseUrl,
                                apiKey: data.apiKey || existingProvider.apiKey,
                                defaultModel: data.model,
                                models: updatedModels
                            }
                        }
                    });
                }

                // Save agent defaults
                await saveSection('agents', {
                    defaults: {
                        model: { primary: `${data.provider}/${data.model}` },
                        workspace: data.workspace,
                        timeoutSeconds,
                        compaction: { mode: data.compactionMode },
                    }
                });

                // Save tools config
                await saveSection('tools', {
                    web: {
                        search: {
                            enabled: data.webSearchEnabled,
                            provider: data.webSearchProvider,
                            apiKey: data.webSearchApiKey,
                        }
                    }
                });

                // Save audio config
                await saveSection('messages', {
                    tts: {
                        auto: data.ttsEnabled ? 'always' : 'off',
                        provider: data.ttsProvider,
                    }
                });

                // Save gateway config (Server Bind), supporting both legacy and current gateway shapes.
                const existingGatewayRes = await fetch('/api/config/gateway');
                const existingGatewayJson = await existingGatewayRes.json();
                const existingGateway = existingGatewayJson?.data || {};
                const gatewayPayload: Record<string, any> = { ...existingGateway };

                if (existingGateway?.control && typeof existingGateway.control === 'object' && !Array.isArray(existingGateway.control)) {
                    delete gatewayPayload.port;
                    delete gatewayPayload.bind;
                    gatewayPayload.control = {
                        ...existingGateway.control,
                        port: gatewayPort,
                        bind: gatewayBind,
                    };
                } else {
                    gatewayPayload.port = gatewayPort;
                    gatewayPayload.bind = gatewayBind;
                }

                await saveSection('gateway', gatewayPayload);

                // Save terminal config
                await saveSection('terminal', {
                    port: terminalPort,
                    bind: terminalBind,
                });

                // Save channel credentials configured in the wizard
                const channelUpdates: Record<string, any> = {};
                if (data.discordToken) {
                    channelUpdates.discord = { enabled: true, token: data.discordToken };
                }
                if (data.telegramToken) {
                    channelUpdates.telegram = { enabled: true, botToken: data.telegramToken };
                }
                if (data.slackToken) {
                    channelUpdates.slack = { enabled: true, botToken: data.slackToken };
                }
                if (Object.keys(channelUpdates).length > 0) {
                    const existingChannelsRes = await fetch('/api/config/channels');
                    const existingChannelsJson = await existingChannelsRes.json();
                    const existingChannels = existingChannelsJson?.data || {};
                    await saveSection('channels', { ...existingChannels, ...channelUpdates });
                }

                // Save wizard metadata
                await saveSection('wizard', {
                    lastRunAt: new Date().toISOString(),
                    lastRunVersion: APP_VERSION,
                    lastRunCommand: 'setup-wizard',
                    lastRunMode: 'local',
                });

                // Save UI config
                const existingUiRes = await fetch('/api/config/ui');
                const existingUiJson = await existingUiRes.json();
                const existingUi = existingUiJson?.data || {};
                await saveSection('ui', {
                    ...existingUi,
                    chatTabs: true,
                    maxChatTabs: 5
                });

                // Initialize a default "General Chat" session so the user has something to start with.
                try {
                    const existingSessionsRes = await fetch('/api/sessions');
                    const existingSessions = await existingSessionsRes.json();
                    if (Array.isArray(existingSessions) && existingSessions.length === 0) {
                        await fetch('/api/sessions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: 'General Chat' }),
                        });
                    }
                } catch (sErr) {
                    console.warn('Failed to initialize default session:', sErr);
                }
            }

            // Done!
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem('pd:setup-skipped');
            }
            setStep(STEPS.length - 1);
            setAutoSkippedToFinish(false);
            await loadWizardMetadata(true);
        } catch (err: any) {
            setError('Failed to save configuration: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const saveSection = async (section: string, data: any) => {
        const res = await fetch(`/api/config/${section}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) {
            throw new Error(json.errors?.join(', ') || 'Validation failed');
        }
    };

    // Helper to calculate visible progress for UI
    const getVisibleStepIndex = () => {
        // Map internal step index to 1-based progress
        // 0=Welcome, 1=Mode
        // If Remote: 1->2(config)->3(finish)
        // If Standalone: 1->2(prob)->3(agent)->4(feat)->5(chan)->6(finish)
        if (data.usageMode === 'remote') {
            if (step >= 6) return step - 4; // 6->2, 7->3
            return step;
        }
        return step;
    };

    const isLastConfigStep = (data.usageMode === 'remote' ? step === 6 : step === 5);
    const isFinishStep = step === STEPS.length - 1;

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
            <div className="w-full max-w-2xl">
                {wizardMeta?.lastRunAt && (
                    <div
                        className="mb-4 rounded-xl p-4 text-sm"
                        style={{ ...cardStyle, color: 'var(--pd-text-main)' }}
                    >
                        <div className="font-semibold" style={{ color: 'var(--pd-text-main)' }}>Previous Setup Detected</div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                            Last run: {new Date(wizardMeta.lastRunAt).toLocaleString()} | Version: {wizardMeta.lastRunVersion || 'unknown'} | Mode: {wizardMeta.lastRunMode}
                        </div>
                        {wizardMeta.lastRunCommand && (
                            <div className="mt-1 text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                                Command: <code>{wizardMeta.lastRunCommand}</code>
                            </div>
                        )}
                        {!shouldForceRun && autoSkippedToFinish && (
                            <div className="mt-2 text-xs text-yellow-400">
                                Wizard was auto-skipped. Use <code>/setup?force=1</code> to re-run all steps.
                            </div>
                        )}
                        {!shouldForceRun && !autoSkippedToFinish && !wizardMetaIsCurrentVersion && (
                            <div className="mt-2 text-xs text-blue-400">
                                App version changed to {APP_VERSION}. Running setup again to refresh configuration.
                            </div>
                        )}
                    </div>
                )}

                {/* Progress Bar (Simplified) */}
                {!isFinishStep && (
                    <div className="mb-8 text-center">
                        <div className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>
                            {STEPS[step].title}
                        </div>
                        <div className="h-1 w-full bg-[var(--pd-surface-panel-2)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[var(--pd-accent)] transition-all duration-300"
                                style={{ width: `${((step + 1) / (data.usageMode === 'remote' ? 3 : STEPS.length - 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Card */}
                <div className="rounded-2xl overflow-hidden shadow-2xl" style={cardStyle}>
                    <div className="p-8">
                        {/* Step Content */}
                        {step === 0 && <StepWelcome />}
                        {step === 1 && <StepUsageMode data={data} update={update} />}
                        {step === 2 && <StepProvider data={data} update={update} />}
                        {step === 3 && <StepAgent data={data} update={update} />}
                        {step === 4 && <StepFeatures data={data} update={update} />}
                        {step === 5 && <StepChannels data={data} update={update} />}
                        {step === 6 && <StepRemoteConfig data={data} update={update} />}
                        {step === 7 && <StepFinish autoSkipped={autoSkippedToFinish} wizardMeta={wizardMeta} currentVersion={APP_VERSION} />}

                        {/* Error */}
                        {error && (
                            <div className="mt-4 p-4 bg-red-500/20 border-2 border-red-500 rounded-xl text-sm text-red-100 shadow-lg animate-pulse">
                                <span className="font-bold mr-2">❌ Error:</span>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div
                        className="px-8 py-4 flex items-center justify-between"
                        style={{
                            background: 'var(--pd-surface-sidebar)',
                            borderTop: '1px solid var(--pd-border)'
                        }}
                    >
                        {step > 0 && !isFinishStep ? (
                            <button
                                onClick={back}
                                className="px-4 py-2 text-sm transition-colors cursor-pointer"
                                style={{ color: 'var(--pd-text-muted)' }}
                            >
                                ← Back
                            </button>
                        ) : <div />}

                        {isFinishStep ? (
                            <div className="flex gap-3">
                                {autoSkippedToFinish && (
                                    <button
                                        onClick={() => router.push('/setup?force=1')}
                                        className="px-5 py-2.5 text-sm text-yellow-300 bg-yellow-900/30 hover:bg-yellow-900/50 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Re-run Setup
                                    </button>
                                )}
                                <button
                                    onClick={() => router.push('/config')}
                                    className="px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer"
                                    style={{
                                        background: 'var(--pd-surface-panel-2)',
                                        color: 'var(--pd-text-main)'
                                    }}
                                >
                                    Open Config
                                </button>
                                <button
                                    onClick={() => router.push('/')}
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer"
                                >
                                    Start Chatting →
                                </button>
                            </div>
                        ) : isLastConfigStep ? (
                            <button
                                onClick={finish}
                                disabled={saving}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                {saving ? <span className="animate-spin">⟳</span> : null}
                                {saving ? 'Saving...' : 'Finish Setup'}
                            </button>
                        ) : (
                            <button
                                onClick={next}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer"
                            >
                                Continue →
                            </button>
                        )}
                    </div>
                </div>

                {/* Skip Link */}
                {!isFinishStep && (
                    <div className="text-center mt-4">
                        <button
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.localStorage.setItem('pd:setup-skipped', 'true');
                                }
                                router.push('/');
                            }}
                            className="text-xs transition-colors cursor-pointer"
                            style={{ color: 'var(--pd-text-muted)' }}
                        >
                            Skip wizard and configure later
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// STEP COMPONENTS
// ═══════════════════════════════════════════════════════════

function StepWelcome() {
    return (
        <div className="text-center py-4">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--pd-text-main)' }}>Welcome to PowerDirector</h2>
            <p style={{ color: 'var(--pd-text-muted)' }} className="max-w-md mx-auto">
                Let&apos;s set up your AI orchestration platform.
            </p>
        </div>
    );
}

function StepUsageMode({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
    return (
        <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--pd-text-main)' }}>How will you use PowerDirector?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--pd-text-muted)' }}>Choose your deployment mode.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => update('usageMode', 'standalone')}
                    className={`p-5 rounded-xl text-left transition-all border-2 cursor-pointer ${data.usageMode === 'standalone' ? 'border-[var(--pd-accent)] bg-[rgba(37,99,235,0.1)]' : 'border-[var(--pd-border)]'}`}
                >
                    <div className="text-2xl mb-2">🏠</div>
                    <div className="font-bold mb-1" style={{ color: 'var(--pd-text-main)' }}>Standalone (Default)</div>
                    <div className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                        Run the AI Agent AND the Dashboard on this machine.
                        <br /><br />
                        Best for personal use, local development, or single-server deployment.
                    </div>
                </button>

                <button
                    onClick={() => update('usageMode', 'remote')}
                    className={`p-5 rounded-xl text-left transition-all border-2 cursor-pointer ${data.usageMode === 'remote' ? 'border-[var(--pd-accent)] bg-[rgba(37,99,235,0.1)]' : 'border-[var(--pd-border)]'}`}
                >
                    <div className="text-2xl mb-2">🎮</div>
                    <div className="font-bold mb-1" style={{ color: 'var(--pd-text-main)' }}>Remote Control</div>
                    <div className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                        Use this Dashboard to control an PowerDirector agent running on another server.
                        <br /><br />
                        Connects via WebSocket.
                    </div>
                </button>
            </div>
        </div>
    );
}

function StepRemoteConfig({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
    return (
        <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--pd-text-main)' }}>Connect to Gateway</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--pd-text-muted)' }}>Enter the connection details for your remote agent.</p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>WebSocket URL</label>
                    <input
                        type="text"
                        value={data.remoteGatewayUrl}
                        onChange={e => update('remoteGatewayUrl', e.target.value)}
                        placeholder="wss://api.your-agent.com"
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>Gateway Token</label>
                    <input
                        type="text"
                        value={data.remoteGatewayToken}
                        onChange={e => update('remoteGatewayToken', e.target.value)}
                        placeholder="Paste your gateway token here"
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={inputStyle}
                    />
                </div>
            </div>
        </div>
    );
}

function StepProvider({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
    const selectedProvider = PROVIDERS.find(p => p.id === data.provider);
    const isCli = selectedProvider?.authType === 'cli';
    const needsKey = !isCli && data.provider !== 'ollama';

    return (
        <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--pd-text-main)' }}>Choose your AI Provider</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--pd-text-muted)' }}>Select your primary model provider. You can add more in Config later.</p>

            <div className="grid grid-cols-2 gap-2 mb-6">
                {PROVIDERS.map(provider => (
                    <button
                        key={provider.id}
                        onClick={() => {
                            update('provider', provider.id);
                            update('model', provider.models[0] || '');
                        }}
                        className={`p-3 rounded-xl text-left transition-all cursor-pointer ${data.provider === provider.id
                            ? 'border-2 border-blue-500'
                            : ''
                            }`}
                        style={{
                            background: data.provider === provider.id ? 'rgba(37, 99, 235, 0.1)' : 'var(--pd-surface-panel-2)',
                            border: data.provider === provider.id ? '2px solid var(--pd-accent)' : '1px solid var(--pd-border)',
                        }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{provider.icon}</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--pd-text-main)' }}>{provider.name}</span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>{provider.description}</div>
                    </button>
                ))}
            </div>

            {/* API Key for standard providers */}
            {needsKey && (
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>API Key</label>
                    <input
                        type="password"
                        value={data.apiKey}
                        onChange={e => update('apiKey', e.target.value)}
                        placeholder={`Enter your ${selectedProvider?.name || ''} API key`}
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={inputStyle}
                    />
                </div>
            )}

            {/* Authorize button for CLI providers */}
            {isCli && (
                <CliAuthorizeSection provider={data.provider} apiKey={data.apiKey} onAuthorized={(token) => update('apiKey', token)} />
            )}

            {selectedProvider && selectedProvider.models.length > 0 && (
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>Default Model</label>
                    <div className="flex gap-2">
                        <select
                            value={data.model}
                            onChange={e => update('model', e.target.value)}
                            className="flex-1 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={inputStyle}
                        >
                            {selectedProvider.models.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                            <option value="custom">-- Custom Model --</option>
                        </select>
                    </div>
                </div>
            )}

            {(data.model === 'custom' || (selectedProvider && selectedProvider.models.length === 0)) && (
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>Custom Model ID</label>
                    <input
                        type="text"
                        value={data.model === 'custom' ? '' : data.model}
                        onChange={e => update('model', e.target.value)}
                        placeholder="e.g. z-ai/glm-4.5-air:free"
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={inputStyle}
                    />
                </div>
            )}
        </div>
    );
}

function StepAgent({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
    return (
        <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--pd-text-main)' }}>Agent Defaults</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--pd-text-muted)' }}>Configure how your AI agents behave by default.</p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>Default Workspace</label>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--pd-text-muted)' }}>Working directory for file operations</p>
                    <input
                        type="text"
                        value={data.workspace}
                        onChange={e => update('workspace', e.target.value)}
                        placeholder="~/projects"
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>Timeout (seconds)</label>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--pd-text-muted)' }}>Max time to wait for model responses</p>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={data.timeoutSeconds}
                        onChange={e => update('timeoutSeconds', digitsOnly(e.target.value))}
                        className="w-32 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>Context Compaction</label>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--pd-text-muted)' }}>How aggressively to compress long conversations</p>
                    <div className="flex gap-2">
                        {[
                            { id: 'safeguard', label: 'Safeguard', desc: 'Balanced' },
                            { id: 'aggressive', label: 'Aggressive', desc: 'Save tokens' },
                            { id: 'none', label: 'None', desc: 'Keep everything' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => update('compactionMode', opt.id)}
                                className="flex-1 p-3 rounded-lg text-center transition-all cursor-pointer"
                                style={{
                                    background: data.compactionMode === opt.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                                    border: data.compactionMode === opt.id ? '2px solid var(--pd-accent)' : '1px solid var(--pd-border)',
                                }}
                            >
                                <div className="text-sm font-medium" style={{ color: 'var(--pd-text-main)' }}>{opt.label}</div>
                                <div className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>{opt.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepFeatures({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
    return (
        <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--pd-text-main)' }}>Features</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--pd-text-muted)' }}>Enable optional capabilities for your agents.</p>

            <div className="space-y-4">
                {/* Web Search */}
                <div className="p-4 rounded-xl" style={cardStyle}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔍</span>
                            <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--pd-text-main)' }}>Web Search</div>
                                <div className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Let agents search the web for information</div>
                            </div>
                        </div>
                        <button
                            onClick={() => update('webSearchEnabled', !data.webSearchEnabled)}
                            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
                            style={{ background: data.webSearchEnabled ? 'var(--pd-accent)' : 'var(--pd-surface-panel-2)' }}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${data.webSearchEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    {data.webSearchEnabled && (
                        <div className="space-y-2 ml-7">
                            <select
                                value={data.webSearchProvider}
                                onChange={e => update('webSearchProvider', e.target.value)}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            >
                                <option value="brave">Brave Search</option>
                                <option value="google">Google</option>
                                <option value="bing">Bing</option>
                                <option value="perplexity">Perplexity</option>
                            </select>
                            <input
                                type="password"
                                value={data.webSearchApiKey}
                                onChange={e => update('webSearchApiKey', e.target.value)}
                                placeholder="Search API key (optional)"
                                className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            />
                        </div>
                    )}
                </div>

                {/* TTS */}
                <div className="p-4 rounded-xl" style={cardStyle}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🗣️</span>
                            <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--pd-text-main)' }}>Text-to-Speech</div>
                                <div className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Voice responses from your agents</div>
                            </div>
                        </div>
                        <button
                            onClick={() => update('ttsEnabled', !data.ttsEnabled)}
                            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
                            style={{ background: data.ttsEnabled ? 'var(--pd-accent)' : 'var(--pd-surface-panel-2)' }}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${data.ttsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    {data.ttsEnabled && (
                        <div className="ml-7">
                            <select
                                value={data.ttsProvider}
                                onChange={e => update('ttsProvider', e.target.value)}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={inputStyle}
                            >
                                <option value="elevenlabs">ElevenLabs</option>
                                <option value="openai">OpenAI</option>
                                <option value="edge">Edge TTS</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Gateway */}
                <div className="p-4 rounded-xl" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🌐</span>
                        <div>
                            <div className="text-sm font-medium" style={{ color: 'var(--pd-text-main)' }}>Gateway</div>
                            <div className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Network settings for API access</div>
                        </div>
                    </div>
                    <div className="space-y-2 ml-7">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Port</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={data.gatewayPort}
                                    onChange={e => update('gatewayPort', digitsOnly(e.target.value))}
                                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={inputStyle}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Bind</label>
                                <select
                                    value={data.gatewayBind}
                                    onChange={e => update('gatewayBind', e.target.value)}
                                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={inputStyle}
                                >
                                    <option value="lan">LAN</option>
                                    <option value="loopback">Localhost</option>
                                    <option value="auto">All Interfaces</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Terminal */}
                <div className="p-4 rounded-xl" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">⌨️</span>
                        <div>
                            <div className="text-sm font-medium" style={{ color: 'var(--pd-text-main)' }}>Terminal</div>
                            <div className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Interactive shell settings</div>
                        </div>
                    </div>
                    <div className="space-y-2 ml-7">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Port</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={data.terminalPort}
                                    onChange={e => update('terminalPort', digitsOnly(e.target.value))}
                                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={inputStyle}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Bind</label>
                                <select
                                    value={data.terminalBind}
                                    onChange={e => update('terminalBind', e.target.value)}
                                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    style={inputStyle}
                                >
                                    <option value="lan">LAN</option>
                                    <option value="loopback">Localhost</option>
                                    <option value="auto">All Interfaces</option>
                                    <option value="tailnet">Tailnet</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepChannels({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
    return (
        <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--pd-text-main)' }}>Chat Channels</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--pd-text-muted)' }}>Connect your favorite platforms. All are optional — you can always add more later.</p>

            <div className="space-y-4">
                <ChannelCard
                    icon="💬" name="Discord" placeholder="Bot token"
                    value={data.discordToken}
                    onChange={v => update('discordToken', v)}
                />
                <ChannelCard
                    icon="✈️" name="Telegram" placeholder="Bot token from @BotFather"
                    value={data.telegramToken}
                    onChange={v => update('telegramToken', v)}
                />
                <ChannelCard
                    icon="💼" name="Slack" placeholder="Bot OAuth token"
                    value={data.slackToken}
                    onChange={v => update('slackToken', v)}
                />
            </div>

            <div
                className="mt-4 p-3 rounded-lg text-xs text-center"
                style={{
                    background: 'var(--pd-surface-panel-2)',
                    color: 'var(--pd-text-muted)'
                }}
            >
                WhatsApp, Signal, Matrix, Email, and more can be configured in Config → Channels
            </div>
        </div>
    );
}

function ChannelCard({ icon, name, placeholder, value, onChange }: { icon: string; name: string; placeholder: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="p-4 rounded-xl" style={cardStyle}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--pd-text-main)' }}>{name}</span>
                {value && <span className="text-xs text-green-500 ml-auto">Connected</span>}
            </div>
            <input
                type="password"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={inputStyle}
            />
        </div>
    );
}

function StepFinish({ autoSkipped, wizardMeta, currentVersion }: { autoSkipped: boolean; wizardMeta: WizardRunMeta | null; currentVersion: string }) {
    return (
        <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--pd-text-main)' }}>{autoSkipped ? 'Setup Already Completed' : "You're All Set!"}</h2>
            <p style={{ color: 'var(--pd-text-muted)' }} className="max-w-md mx-auto">
                {autoSkipped
                    ? 'PowerDirector was already configured in a previous wizard run.'
                    : 'PowerDirector is configured and ready to go. You can start chatting right away or fine-tune settings anytime.'}
            </p>
            {wizardMeta?.lastRunAt && (
                <div className="mt-3 text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                    Last setup run: {new Date(wizardMeta.lastRunAt).toLocaleString()} ({wizardMeta.lastRunMode}) | Saved version: {wizardMeta.lastRunVersion || 'unknown'} | App version: {currentVersion}
                </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
                {['Model provider set', 'Agent defaults saved', 'Features configured', 'Ready to chat'].map(item => (
                    <div
                        key={item}
                        className="p-2 rounded-lg text-xs"
                        style={{
                            background: 'var(--pd-surface-panel-2)',
                            color: 'var(--pd-text-muted)'
                        }}
                    >
                        <span className="text-green-500">✓</span> {item}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// CLI INSTALL + OAUTH AUTHORIZATION
// ═══════════════════════════════════════════════════════════

function CliAuthorizeSection({ provider, apiKey, onAuthorized }: { provider: string; apiKey: string; onAuthorized: (token: string) => void }) {
    const [cliInstalled, setCliInstalled] = useState<boolean | null>(null);
    const [cliAuthed, setCliAuthed] = useState<boolean>(false);
    const [flowState, setFlowState] = useState<'idle' | 'installing' | 'installed' | 'authorizing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [statusMsg, setStatusMsg] = useState('');

    const isGemini = provider === 'gemini-cli';
    const cliName = isGemini ? 'gemini' : 'codex';
    const pkgName = isGemini ? '@google/gemini-cli' : '@openai/codex';
    const isAuthorized = apiKey?.startsWith('cli-authorized') || cliAuthed || flowState === 'success';

    // Check install + auth status on mount
    useEffect(() => {
        setCliInstalled(null);
        setCliAuthed(false);
        setFlowState('idle');
        setErrorMsg('');
        setStatusMsg('');
        fetch(`/api/auth/cli?check=${provider}`)
            .then(r => r.json())
            .then(data => {
                setCliInstalled(data.installed);
                if (data.authed) {
                    setCliAuthed(true);
                    onAuthorized(`cli-authorized-${provider}`);
                }
            })
            .catch(() => setCliInstalled(false));
    }, [provider]);

    // Poll a flowId — clean status only, no raw output
    const pollFlow = (flowId: string, onSuccess: () => void) => {
        let attempts = 0;
        const maxAttempts = 300;
        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch(`/api/auth/cli?flowId=${flowId}`);
                const data = await res.json();

                if (data.status === 'success') {
                    clearInterval(interval);
                    onSuccess();
                } else if (data.status === 'error') {
                    clearInterval(interval);
                    setFlowState('error');
                    setErrorMsg(data.error || 'Operation failed');
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    setFlowState('error');
                    setErrorMsg('Operation timed out. Please try again.');
                }
            } catch {
                // Network blip
            }
        }, 1000);
    };

    // ── Install ──
    const startInstall = async () => {
        setFlowState('installing');
        setErrorMsg('');
        setStatusMsg(`Installing ${pkgName}...`);

        try {
            const res = await fetch('/api/auth/cli', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, action: 'install' }),
            });
            const json = await res.json();

            if (json.alreadyInstalled) {
                setCliInstalled(true);
                setFlowState('installed');
                setStatusMsg('');
                return;
            }
            if (json.error) {
                setFlowState('error');
                setErrorMsg(json.error);
                return;
            }

            pollFlow(json.flowId, () => {
                setCliInstalled(true);
                setFlowState('installed');
                setStatusMsg(`✓ ${cliName} installed successfully!`);
            });
        } catch (err: any) {
            setFlowState('error');
            setErrorMsg(err.message);
        }
    };

    // ── Authorize ──
    const startAuth = async () => {
        setFlowState('authorizing');
        setErrorMsg('');
        setStatusMsg('A browser window will open for sign-in...');

        try {
            const res = await fetch('/api/auth/cli', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, action: 'auth' }),
            });
            const json = await res.json();

            if (json.alreadyAuthed) {
                setFlowState('success');
                setCliAuthed(true);
                onAuthorized(`cli-authorized-${provider}`);
                setStatusMsg('');
                return;
            }
            if (json.error || json.notInstalled) {
                setFlowState('error');
                setErrorMsg(json.error || 'CLI not installed');
                return;
            }

            setStatusMsg('Complete the sign-in in the browser window that opened, then return here.');
            pollFlow(json.flowId, () => {
                setFlowState('success');
                setCliAuthed(true);
                onAuthorized(`cli-authorized-${provider}`);
                setStatusMsg('');
            });
        } catch (err: any) {
            setFlowState('error');
            setErrorMsg(err.message);
        }
    };

    const reset = () => {
        setFlowState('idle');
        setErrorMsg('');
        setStatusMsg('');
    };

    return (
        <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>
                {isGemini ? 'Gemini CLI' : 'Codex CLI'} Setup
            </label>

            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--pd-text-muted)' }}>
                <span style={{ color: (cliInstalled || flowState === 'installed') ? '#22c55e' : 'var(--pd-text-muted)' }}>
                    {(cliInstalled || flowState === 'installed') ? '✓' : '①'} Install CLI
                </span>
                <span>→</span>
                <span style={{ color: isAuthorized ? '#22c55e' : 'var(--pd-text-muted)' }}>
                    {isAuthorized ? '✓' : '②'} Authorize Account
                </span>
            </div>

            {/* Checking state */}
            {cliInstalled === null && (
                <p className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>Checking if {cliName} is installed...</p>
            )}

            {/* Step 1: Install */}
            {cliInstalled === false && flowState !== 'installed' && (
                <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>
                        {cliName} CLI is not installed. Click below to install it automatically.
                    </p>
                    <button
                        onClick={startInstall}
                        disabled={flowState === 'installing'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ background: flowState === 'installing' ? '#d97706' : 'var(--pd-accent)' }}
                    >
                        {flowState === 'installing' ? (
                            <><span className="animate-spin">⟳</span> Installing...</>
                        ) : (
                            <><span>📦</span> Install {cliName} CLI</>
                        )}
                    </button>
                </div>
            )}

            {/* Step 2: Authorize */}
            {(cliInstalled === true || flowState === 'installed') && !isAuthorized && (
                <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>
                        {isGemini
                            ? `${cliName} is installed. Click below to sign in with your Google account.`
                            : `${cliName} is installed. Click below to sign in with your ChatGPT account.`}
                    </p>
                    <button
                        onClick={startAuth}
                        disabled={flowState === 'authorizing'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ background: flowState === 'authorizing' ? '#d97706' : 'var(--pd-accent)' }}
                    >
                        {flowState === 'authorizing' ? (
                            <><span className="animate-spin">⟳</span> Waiting for sign-in...</>
                        ) : (
                            <><span>{isGemini ? '🔵' : '🟢'}</span> Sign in with {isGemini ? 'Google' : 'OpenAI'}</>
                        )}
                    </button>
                </div>
            )}

            {/* Already authorized */}
            {isAuthorized && (
                <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: '#16a34a', width: 'fit-content' }}>
                    <span>✓</span> Authorized
                </div>
            )}

            {/* Clean status message */}
            {statusMsg && flowState !== 'error' && !isAuthorized && (
                <p className="text-xs mt-2" style={{ color: 'var(--pd-text-muted)' }}>
                    {statusMsg}
                </p>
            )}

            {/* Error */}
            {flowState === 'error' && errorMsg && (
                <div className="mt-2 p-2 bg-red-900/30 border border-red-800 rounded-lg text-xs text-red-300" style={{ whiteSpace: 'pre-wrap' }}>
                    {errorMsg}
                    <button onClick={reset} className="ml-2 underline cursor-pointer">
                        Try again
                    </button>
                </div>
            )}
        </div>
    );
}
