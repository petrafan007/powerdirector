import type { AuthProfileStore, AuthStoreProfile } from './auth-profile-store';

type AuthMode = 'oauth' | 'api_key' | 'api-key' | 'token';

export interface AuthProfile {
    provider?: string;
    mode?: AuthMode;
    email?: string;
    apiKey?: string;
    key?: string;
    oauthToken?: string;
    token?: string;
    access?: string;
    refresh?: string;
    expires?: number;
    projectId?: string;
    type?: AuthMode;
    label?: string;
}

const REDACTED_VALUES = new Set([
    '__POWERDIRECTOR_REDACTED__',
    '__POWERDIRECTOR_REDACTED__',
    '********'
]);

function normalizeAuthTarget(value: string | undefined | null): string {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeMode(value: unknown): AuthMode | undefined {
    if (typeof value !== 'string') return undefined;
    if (value === 'api_key' || value === 'api-key' || value === 'oauth' || value === 'token') {
        return value;
    }
    return undefined;
}

function cleanCredential(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (REDACTED_VALUES.has(trimmed)) return undefined;
    return trimmed;
}

function isExpired(profile: { expires?: number } | undefined): boolean {
    if (!profile) return false;
    if (typeof profile.expires !== 'number' || !Number.isFinite(profile.expires) || profile.expires <= 0) {
        return false;
    }
    return Date.now() >= profile.expires;
}

function buildOAuthCredential(provider: string | undefined, profile: AuthProfile | AuthStoreProfile | undefined): string | undefined {
    if (!profile || isExpired(profile)) return undefined;

    const access = cleanCredential((profile as any).access)
        || cleanCredential((profile as any).oauthToken)
        || cleanCredential((profile as any).token);
    if (!access) return undefined;

    const normalizedProvider = normalizeAuthTarget(provider);
    if (normalizedProvider === 'googlegeminicli') {
        const projectId = cleanCredential((profile as any).projectId);
        if (projectId) {
            return JSON.stringify({ token: access, projectId });
        }
    }

    return access;
}

function pickCredentialByMode(params: {
    mode?: AuthMode;
    provider?: string;
    configProfile?: AuthProfile;
    storeProfile?: AuthStoreProfile;
}): string | undefined {
    const { mode, provider, configProfile, storeProfile } = params;

    const apiKeyFromStore = cleanCredential(storeProfile?.key);
    const tokenFromStore = cleanCredential(storeProfile?.token);
    const oauthFromStore = buildOAuthCredential(provider, storeProfile);

    const apiKeyFromConfig = cleanCredential(configProfile?.apiKey) || cleanCredential(configProfile?.key);
    const tokenFromConfig = cleanCredential(configProfile?.token) || cleanCredential(configProfile?.oauthToken);
    const oauthFromConfig = buildOAuthCredential(provider, configProfile);

    switch (mode) {
        case 'api_key':
        case 'api-key':
            return apiKeyFromStore || apiKeyFromConfig || tokenFromStore || tokenFromConfig;
        case 'oauth':
            return oauthFromStore || oauthFromConfig || tokenFromStore || tokenFromConfig;
        case 'token':
            if (isExpired(storeProfile) || isExpired(configProfile)) return undefined;
            return tokenFromStore || tokenFromConfig || oauthFromStore || oauthFromConfig || apiKeyFromStore || apiKeyFromConfig;
        default:
            if (!isExpired(storeProfile)) {
                return oauthFromStore || tokenFromStore || apiKeyFromStore;
            }
            if (!isExpired(configProfile)) {
                return oauthFromConfig || tokenFromConfig || apiKeyFromConfig;
            }
            return undefined;
    }
}

function resolveOrderForProvider(order: Record<string, string[]> | undefined, normalizedTarget: string): string[] {
    if (!order) return [];
    for (const [provider, profileIds] of Object.entries(order)) {
        if (normalizeAuthTarget(provider) !== normalizedTarget) continue;
        if (!Array.isArray(profileIds)) continue;
        return profileIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
    }
    return [];
}

function dedupe(values: string[]): string[] {
    const out: string[] = [];
    for (const value of values) {
        if (!out.includes(value)) out.push(value);
    }
    return out;
}

function profileProviderMatches(normalizedTarget: string, profile: AuthProfile | AuthStoreProfile | undefined): boolean {
    if (!profile) return false;
    return normalizeAuthTarget(profile.provider) === normalizedTarget;
}

export function resolveAuthCredential(
    target: string,
    profiles: Record<string, AuthProfile> | undefined,
    order: Record<string, string[]> | undefined,
    store?: AuthProfileStore
): string | undefined {
    const normalizedTarget = normalizeAuthTarget(target);
    if (!normalizedTarget) return undefined;

    const allProfiles = profiles || {};
    const configOrder = order || {};
    const storeProfiles = store?.profiles || {};
    const storeOrder = store?.order || {};

    const explicitOrder = resolveOrderForProvider(storeOrder, normalizedTarget);
    const configExplicitOrder = resolveOrderForProvider(configOrder, normalizedTarget);

    const configProfileIds = Object.entries(allProfiles)
        .filter(([, profile]) => normalizeAuthTarget(profile?.provider) === normalizedTarget)
        .map(([id]) => id);

    const storeProfileIds = Object.entries(storeProfiles)
        .filter(([, profile]) => normalizeAuthTarget(profile?.provider) === normalizedTarget)
        .map(([id]) => id);

    const candidateIds = explicitOrder.length > 0
        ? dedupe([...explicitOrder, ...configProfileIds, ...storeProfileIds])
        : configExplicitOrder.length > 0
            ? dedupe([...configExplicitOrder, ...configProfileIds, ...storeProfileIds])
            : dedupe([...configProfileIds, ...storeProfileIds]);

    for (const profileId of candidateIds) {
        const configProfile = allProfiles[profileId];
        const storeProfile = storeProfiles[profileId];

        const hasProviderMatch = profileProviderMatches(normalizedTarget, configProfile)
            || profileProviderMatches(normalizedTarget, storeProfile);
        if (!hasProviderMatch) continue;

        const mode = normalizeMode(configProfile?.mode) || normalizeMode(configProfile?.type) || normalizeMode(storeProfile?.type);
        const provider = configProfile?.provider || storeProfile?.provider;
        const credential = pickCredentialByMode({
            mode,
            provider,
            configProfile,
            storeProfile
        });
        if (credential) return credential;
    }

    return undefined;
}
