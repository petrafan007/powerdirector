'use client';

import React from 'react';
import Link from 'next/link';
import { SECTION_GROUPS } from './definitions';
import { useSettings } from './SettingsContext';
import GlobalSearchResults from '../components/config/GlobalSearchResults';

export default function ConfigPage() {
    const { searchQuery, loading, error } = useSettings();

    if (error) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="max-w-md w-full p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-red-500 mb-2">Failed to load configuration</h2>
                    <p className="text-sm opacity-70 mb-6" style={{ color: 'var(--pd-text-muted)' }}>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse flex flex-col items-center gap-4 text-gray-500">
                    <div className="text-4xl">⚙️</div>
                    <div>Loading configuration...</div>
                </div>
            </div>
        );
    }

    if (searchQuery) {
        return <GlobalSearchResults />;
    }

    return (
        <div className="space-y-12 pb-32">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--pd-text-main)' }}>Config</h1>
                <p className="text-lg opacity-60" style={{ color: 'var(--pd-text-muted)' }}>
                    Select a section to edit configuration values.
                </p>
            </div>

            {SECTION_GROUPS.map((group) => (
                <div key={group.label} className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--pd-text-muted)' }}>
                            {group.label}
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.sections.map((section) => (
                            <Link
                                key={section.id}
                                href={`/config/${section.id}`}
                                className="rounded-xl border p-4 hover:border-blue-500/60 transition-colors"
                                style={{ borderColor: 'var(--pd-border)', background: 'var(--pd-surface-panel-2)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{section.icon}</div>
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate" style={{ color: 'var(--pd-text-main)' }}>
                                            {section.name}
                                        </div>
                                        <div className="text-xs font-mono opacity-70" style={{ color: 'var(--pd-text-muted)' }}>
                                            {section.id}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
