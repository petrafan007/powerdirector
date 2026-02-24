import { NextResponse } from 'next/server';
import { getConfigManager } from '@/lib/config-instance';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ── Known provider → display info mapping ──
const PROVIDER_META: Record<string, { name: string; icon: string }> = {
    anthropic: { name: 'Anthropic', icon: '🟣' },
    openai: { name: 'OpenAI', icon: '🟢' },
    gemini: { name: 'Google Gemini', icon: '🔵' },
    'google-gemini-cli': { name: 'Gemini CLI', icon: '🔵' },
    'openai-codex': { name: 'Codex CLI', icon: '🟢' },
    zai: { name: 'Z.AI', icon: '⚡' },
    perplexity: { name: 'Perplexity', icon: '🔮' },
    openrouter: { name: 'OpenRouter', icon: '🌈' },
    ollama: { name: 'Ollama (Local)', icon: '🏠' },
    'ollama-desktop': { name: 'Ollama (Desktop)', icon: '🖥️' },
    minimax: { name: 'Minimax', icon: '🤖' },
    deepseek: { name: 'DeepSeek', icon: '🐋' },
    xai: { name: 'xAI (Grok)', icon: '🤯' },
    mistral: { name: 'Mistral', icon: '🌊' },
    glm: { name: 'GLM', icon: '🧠' },
    huggingface: { name: 'HuggingFace', icon: '🤗' },
};

/**
 * GET /api/providers — returns available providers with models.
 *
 * Models come from models.providers.<name>.models[] in the config (PowerDirector pattern).
 * Exception: ollama-desktop discovers models dynamically from Ollama API.
 *
 * Provider availability is determined by:
 *  - API key presence (config or env)
 *  - CLI auth files (~/.gemini/oauth_creds.json, ~/.codex/auth.json)
 *  - Explicit config entry
 */
export async function GET() {
    try {
        const mgr = getConfigManager();
        const config = mgr.getAll(false);

        const modelsSection = (config as any)?.models ?? {};
        const providers = modelsSection?.providers ?? {};

        interface ProviderInfo {
            id: string;
            name: string;
            icon: string;
            models: string[];
            defaultModel: string;
            authed: boolean;
        }

        const result: ProviderInfo[] = [];
        const seen = new Set<string>();

        const addProvider = (p: ProviderInfo) => {
            if (seen.has(p.id)) return;
            seen.add(p.id);
            result.push(p);
        };

        // Helper: get model id list from a provider config's models array
        const getModelIds = (pc: any): string[] => {
            if (!pc?.models || !Array.isArray(pc.models)) return [];
            return pc.models.map((m: any) => m.id || m.name || m).filter(Boolean);
        };

        // ── 1. Iterate over all providers in config ──
        for (const [providerId, providerConfig] of Object.entries(providers)) {
            const pc = providerConfig as any;
            const meta = PROVIDER_META[providerId] ?? { name: providerId, icon: '🔧' };

            // Determine auth status
            let authed = false;

            // Check API key in config or env
            const envKey = `${providerId.replace(/-/g, '_').toUpperCase()}_API_KEY`;
            if (pc?.apiKey || process.env[envKey]) {
                authed = true;
            }

            // Special CLI auth checks
            if (providerId === 'google-gemini-cli') {
                authed = existsSync(join(homedir(), '.gemini', 'oauth_creds.json'));
            } else if (providerId === 'openai-codex') {
                authed = existsSync(join(homedir(), '.codex', 'auth.json')) || !!process.env.OPENAI_API_KEY;
            }

            // If config has models array, provider is explicitly configured — show it
            let modelIds = getModelIds(pc);
            if (modelIds.length > 0) {
                authed = true; // If models are configured, user intends to use this provider
            }

            // ── Dynamic Model Discovery ──
            if (pc?.retrieveLocalModels) {
                authed = true; // Intent to use is explicit
                const baseURL = pc.baseURL || pc.baseUrl || (providerId === 'ollama-desktop' ? 'http://127.0.0.1:11434/v1' : '');
                if (baseURL) {
                    const tagsURL = baseURL.replace(/\/v1\/?$/, '/api/tags');
                    try {
                        const resp = await fetch(tagsURL, { signal: AbortSignal.timeout(2000) });
                        if (resp.ok) {
                            const data = await resp.json();
                            const remoteModels = data.models?.map((m: any) => m.name) || [];
                            if (remoteModels.length > 0) {
                                modelIds = remoteModels;
                            }
                        }
                    } catch {
                        console.warn(`[ProvidersAPI] Failed to retrieve local models for ${providerId} at ${tagsURL}`);
                    }
                }
            }

            if (!authed || (modelIds.length === 0 && !pc?.retrieveLocalModels)) continue;

            addProvider({
                id: providerId,
                name: meta.name,
                icon: meta.icon,
                models: modelIds,
                defaultModel: pc?.defaultModel || modelIds[0] || '',
                authed: true,
            });
        }

        return NextResponse.json({ providers: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
