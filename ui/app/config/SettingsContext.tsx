'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SECTION_GROUPS } from './definitions';
import { GatewayClient, LocalClient, RemoteClient, GatewayMode, GatewayStatus } from '../../lib/gateway-client';

interface SettingsContextType {
    config: any;
    originalConfig: any;
    fullSchema: Record<string, any>;
    loading: boolean;
    error: string | null;
    saving: boolean;
    dirty: boolean;
    pendingChanges: number;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    viewMode: 'form' | 'raw';
    setViewMode: (mode: 'form' | 'raw') => void;
    updateConfig: (path: string, value: any) => void;
    setRawConfig: (newConfig: any) => void;
    saveConfig: () => Promise<void>;
    resetConfig: () => void;
    refreshConfig: () => Promise<void>;

    // Gateway State
    gatewayClient: GatewayClient | null;
    gatewayMode: GatewayMode;
    gatewayStatus: GatewayStatus;
    setGatewayMode: (mode: GatewayMode) => void;
    configureGateway: (url: string, token: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<any>(null);
    const [originalConfig, setOriginalConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [pendingChanges, setPendingChanges] = useState(0);
    // Track unique paths to avoid over-counting updates (e.g. keystrokes)
    const modifiedPaths = useRef<Set<string>>(new Set());
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'form' | 'raw'>('form');

    // Gateway State
    const [gatewayMode, setGatewayModeState] = useState<GatewayMode>('local');
    const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>('disconnected');
    const [gatewayClient, setGatewayClient] = useState<GatewayClient | null>(null);

    const router = useRouter();

    // Initialize Gateway Client
    useEffect(() => {
        // Load preference from localStorage or config
        const savedMode = (localStorage.getItem('pd_gateway_mode') as GatewayMode) || 'local';
        setGatewayModeState(savedMode);
        initGateway(savedMode);

        return () => {
            if (gatewayClient) {
                gatewayClient.disconnect();
            }
        };
    }, []);

    const initGateway = (mode: GatewayMode, url?: string, token?: string) => {
        // Cleanup existing
        if (gatewayClient) {
            gatewayClient.disconnect();
            gatewayClient.removeAllListeners();
        }

        let client: GatewayClient;
        if (mode === 'remote') {
            const targetUrl = url || localStorage.getItem('pd_gateway_url') || '';
            const targetToken = token || localStorage.getItem('pd_gateway_token') || '';
            if (!targetUrl) {
                console.warn('Remote mode selected but no URL provided');
                setGatewayStatus('error');
                return; // Wait for config
            }
            client = new RemoteClient(targetUrl, targetToken);
        } else {
            client = new LocalClient();
        }

        // Bind status updates
        client.on('status', (status: GatewayStatus) => {
            setGatewayStatus(status);
        });

        client.connect().catch(err => {
            console.error('Failed to connect to gateway:', err);
        });

        setGatewayClient(client);
    };

    const setGatewayMode = useCallback((mode: GatewayMode) => {
        setGatewayModeState(mode);
        localStorage.setItem('pd_gateway_mode', mode);
        initGateway(mode);
    }, []);

    const configureGateway = useCallback(async (url: string, token: string) => {
        localStorage.setItem('pd_gateway_url', url);
        localStorage.setItem('pd_gateway_token', token);
        if (gatewayMode === 'remote') {
            initGateway('remote', url, token);
        }
    }, [gatewayMode]);

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/config');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(errorData.error || `HTTP error ${res.status}`);
            }
            const json = await res.json();
            const data = json.data !== undefined ? json.data : json;

            // We use SECTION_GROUPS to find all possible sections
            const sections: string[] = [];
            SECTION_GROUPS.forEach(g => g.sections.forEach(s => sections.push(s.id)));
            sections.forEach(s => {
                if (data[s] === undefined) data[s] = {};
            });

            setConfig(data);
            setOriginalConfig(structuredClone(data));
            setDirty(false);
            setPendingChanges(0);
            modifiedPaths.current.clear();
        } catch (err: any) {
            console.error('Failed to load config', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const [fullSchema, setFullSchema] = useState<Record<string, any>>({});

    // ... existing state ...

    // Fetch all schemas for global search
    const fetchAllSchemas = useCallback(async () => {
        try {
            // Get list of sections from definitions (or API if available)
            // For now, we use the hardcoded list from definitions but we could fetch /api/config/sections
            // We'll iterate over the known sections from SECTION_GROUPS
            const sections: string[] = [];
            SECTION_GROUPS.forEach(g => g.sections.forEach(s => sections.push(s.id)));

            const schemas: Record<string, any> = {};

            await Promise.all(sections.map(async (sectionId) => {
                try {
                    const res = await fetch(`/api/config/schema/${sectionId}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.schema) {
                            schemas[sectionId] = json.schema;
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to fetch schema for ${sectionId}`, e);
                }
            }));

            setFullSchema(schemas);
        } catch (err) {
            console.error('Failed to fetch full schema', err);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
        fetchAllSchemas();
    }, [fetchConfig, fetchAllSchemas]);

    const updateConfig = useCallback((path: string, value: any) => {
        setConfig((prev: any) => {
            const next = structuredClone(prev) || {};
            const keys = path.split('.');
            let target = next;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                const nextKey = keys[i + 1];
                const wantsArray = /^\d+$/.test(nextKey);

                if (target[key] === undefined || target[key] === null) {
                    target[key] = wantsArray ? [] : {};
                }
                target = target[key];
            }

            const finalKey = keys[keys.length - 1];
            target[finalKey] = value;
            return next;
        });

        // Track unique path to fix "5 pending changes" for single field
        if (!modifiedPaths.current.has(path)) {
            modifiedPaths.current.add(path);
            setPendingChanges(prev => prev + 1);
        }
        setDirty(true);
    }, []);

    const setRawConfig = useCallback((newConfig: any) => {
        setConfig(newConfig);
        setDirty(true);
        // We can't track precise paths in raw edits easily, so broadly indicate 1 pending change
        setPendingChanges(prev => prev === 0 ? 1 : prev);
    }, []);

    const saveConfig = async () => {
        if (!dirty) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setOriginalConfig(structuredClone(config));
                setDirty(false);
                setPendingChanges(0);
                modifiedPaths.current.clear();
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('pd:config-saved'));
                }
                router.refresh();
                setToast({ message: 'Configuration saved successfully', type: 'success' });
                setTimeout(() => setToast(null), 3000);
            } else {
                const errorData = await res.json().catch(() => ({ error: res.statusText }));
                // If validation errors are present, format them nicely
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    throw new Error(`Validation failed:\n${errorData.errors.join('\n')}`);
                }
                throw new Error(errorData.error || `Failed to save: HTTP ${res.status}`);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setToast({ message: err.message, type: 'error' });
            setTimeout(() => setToast(null), 5000);
        } finally {
            setSaving(false);
        }
    };

    const resetConfig = useCallback(() => {
        setConfig(structuredClone(originalConfig));
        setDirty(false);
        setPendingChanges(0);
        modifiedPaths.current.clear();
    }, [originalConfig]);

    const refreshConfigMemo = useCallback(async () => {
        await fetchConfig();
        await fetchAllSchemas();
    }, [fetchConfig, fetchAllSchemas]);

    const contextValue = useMemo(() => ({
        config,
        originalConfig,
        fullSchema,
        loading,
        error,
        saving,
        dirty,
        pendingChanges,
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        updateConfig,
        setRawConfig,
        saveConfig,
        resetConfig,
        refreshConfig: refreshConfigMemo,
        gatewayClient,
        gatewayMode,
        gatewayStatus,
        setGatewayMode,
        configureGateway
    }), [
        config,
        originalConfig,
        fullSchema,
        loading,
        error,
        saving,
        dirty,
        pendingChanges,
        searchQuery,
        viewMode,
        updateConfig,
        setRawConfig,
        saveConfig,
        resetConfig,
        refreshConfigMemo,
        gatewayClient,
        gatewayMode,
        gatewayStatus,
        setGatewayMode,
        configureGateway
    ]);

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
            {/* Global Toast */}
            {toast && (
                <div
                    className={`fixed bottom-24 right-6 px-4 py-3 rounded-lg shadow-xl text-sm font-medium z-50 text-white backdrop-blur-md border animate-in slide-in-from-right-10 fade-in duration-300 ${toast.type === 'success'
                        ? 'bg-green-900/90 border-green-700 shadow-green-900/20'
                        : 'bg-red-900/90 border-red-700 shadow-red-900/20'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <span className="text-lg">{toast.type === 'success' ? '✅' : '⚠️'}</span>
                        <div className="whitespace-pre-line">{toast.message}</div>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 opacity-50 hover:opacity-100"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </SettingsContext.Provider>
    );
}
