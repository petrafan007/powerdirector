'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '../../config/SettingsContext';

export default function RawConfigEditor() {
    const { config, setRawConfig } = useSettings();
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [localJson, setLocalJson] = useState('');

    // Sync local text from config whenever config changes (e.g. after fetch or save)
    useEffect(() => {
        if (config) {
            setLocalJson(JSON.stringify(config, null, 4));
            setJsonError(null);
        }
    }, [config]);

    return (
        <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
            <div className="px-6 pt-6 pb-3 shrink-0">
                <h2 className="text-lg font-bold" style={{ color: 'var(--pd-text-main)' }}>Raw JSON Configuration</h2>
                <p className="text-sm opacity-60" style={{ color: 'var(--pd-text-muted)' }}>
                    Directly edit the configuration object. Invalid JSON will prevent saving.
                </p>
            </div>
            <div className="flex-1 mx-6 mb-6 relative rounded-lg overflow-hidden border" style={{ borderColor: 'var(--pd-border)', minHeight: 0 }}>
                <textarea
                    className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none scrollbar-thin"
                    style={{
                        background: 'var(--pd-input-bg)',
                        color: 'var(--pd-text-main)',
                        minHeight: '100%'
                    }}
                    value={localJson}
                    onChange={(e) => {
                        const text = e.target.value;
                        setLocalJson(text);
                        try {
                            const parsed = JSON.parse(text);
                            setRawConfig(parsed);
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
        </div>
    );
}
