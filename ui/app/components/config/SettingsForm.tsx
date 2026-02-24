'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useSettings } from '../../config/SettingsContext';

interface SettingsFormProps {
    section: string;
    title: string;
    description?: string;
    children: (data: any, update: (path: string, value: any) => void) => ReactNode;
}

export default function SettingsForm({ section, title, description, children }: SettingsFormProps) {
    const { config, updateConfig, viewMode } = useSettings();
    const [jsonError, setJsonError] = useState<string | null>(null);

    const sectionData = config?.[section] || {};

    // Helper to update specific section path
    const handleUpdate = useCallback((path: string, value: any) => {
        const fullPath = path ? `${section}.${path}` : section;
        updateConfig(fullPath, value);
    }, [section, updateConfig]);

    if (!config) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse" style={{ color: 'var(--pd-text-muted)' }}>Loading {title}...</div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--pd-text-main)' }}>{title}</h2>
                {description && <p className="text-sm mt-1" style={{ color: 'var(--pd-text-muted)' }}>{description}</p>}
            </div>

            {/* Form Fields or Raw JSON */}
            {viewMode === 'raw' ? (
                <div className="relative rounded-lg overflow-hidden border mb-4" style={{ borderColor: 'var(--pd-border)', height: '500px' }}>
                    <textarea
                        className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none scrollbar-thin"
                        style={{
                            background: 'var(--pd-input-bg)',
                            color: 'var(--pd-text-main)'
                        }}
                        defaultValue={JSON.stringify(sectionData, null, 4)}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleUpdate('', parsed);
                                setJsonError(null);
                            } catch (err) {
                                setJsonError((err as Error).message);
                            }
                        }}
                        spellCheck={false}
                    />
                    {jsonError && (
                        <div className="absolute bottom-4 right-4 bg-red-900/90 text-red-200 px-3 py-2 rounded text-xs font-mono border border-red-700 backdrop-blur shadow-lg">
                            ⚠️ Invalid JSON: {jsonError}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-1" style={{ borderColor: 'var(--pd-border)' }}>
                    {children(sectionData, handleUpdate)}
                </div>
            )}
        </div>
    );
}

// Helper to get nested values safely
export function getVal(obj: any, path: string, fallback?: any): any {
    if (!obj) return fallback;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === undefined || current === null) return fallback;
        current = current[key];
    }
    return current ?? fallback;
}
