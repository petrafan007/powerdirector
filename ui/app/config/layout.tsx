
'use client';

import { useSettings } from './SettingsContext';
import { SECTION_GROUPS } from './definitions';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';


import RawConfigEditor from '../components/config/RawConfigEditor';

// Inner component to consume context
function ConfigLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const {
        dirty,
        pendingChanges,
        saveConfig,
        searchQuery,
        setSearchQuery,
        loading,
        saving,
        refreshConfig,
        viewMode,
        setViewMode
    } = useSettings();

    const isAllConfig = pathname === '/config';

    return (
        <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--pd-surface-main)' }}>
            {/* Config Sidebar */}
            <nav
                className="border-r flex flex-col h-full shrink-0"
                style={{
                    width: 'var(--pd-sidebar-width)',
                    background: 'var(--pd-surface-sidebar)',
                    borderColor: 'var(--pd-border)'
                }}
            >
                {/* Header */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--pd-border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <Link href="/" className="flex items-center gap-2 text-sm transition-colors opacity-70 hover:opacity-100" style={{ color: 'var(--pd-text-muted)' }}>
                            <span>←</span>
                            <span>Back</span>
                        </Link>
                        <h1 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--pd-text-muted)' }}>
                            Config
                        </h1>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search config..."
                            className="w-full px-3 py-2 rounded-lg text-sm border transition-colors outline-none focus:ring-2 focus:ring-blue-500/20"
                            style={{
                                background: 'var(--pd-surface-input)',
                                borderColor: 'var(--pd-border)',
                                color: 'var(--pd-text-main)'
                            }}
                            value={searchQuery}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchQuery(val);
                                // Redirect to All Config to show global results if search is active and not already there
                                if (val && pathname !== '/config') {
                                    router.push('/config');
                                }
                            }}
                        />
                        <span className="absolute right-3 top-2.5 text-xs opacity-50">⌘K</span>
                    </div>
                </div>

                {/* Section List */}
                <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
                    {/* All Config Link */}
                    <div className="mb-6 px-2">
                        <Link
                            href="/config"
                            className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isAllConfig
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'hover:bg-gray-800/50'
                                }`}
                            style={!isAllConfig ? { color: 'var(--pd-text-main)' } : undefined}
                        >
                            <span className="text-lg">⚡</span>
                            <span>All Config</span>
                        </Link>
                    </div>

                    {SECTION_GROUPS.map((group) => (
                        <div key={group.label} className="mb-6 px-2">
                            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                {group.label}
                            </div>
                            <div className="space-y-0.5">
                                {group.sections.map((section) => {
                                    const href = `/config/${section.id}`;
                                    const isActive = pathname === href;
                                    const matchesSearch = !searchQuery ||
                                        section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        section.id.toLowerCase().includes(searchQuery.toLowerCase());
                                    const opacity = searchQuery && !matchesSearch ? 0.3 : 1;

                                    return (
                                        <Link
                                            key={section.id}
                                            href={href}
                                            className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all ${isActive
                                                ? 'bg-gray-800 text-white font-medium'
                                                : 'hover:bg-gray-800/30'
                                                }`}
                                            style={{
                                                color: isActive ? 'white' : 'var(--pd-text-muted)',
                                                opacity
                                            }}
                                        >
                                            <span className="text-base opacity-80">{section.icon}</span>
                                            <span>{section.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer with View Toggle */}
                <div className="p-4 border-t" style={{ borderColor: 'var(--pd-border)' }}>
                    <div className="flex p-1 rounded-lg border" style={{ background: 'var(--pd-input-bg)', borderColor: 'var(--pd-border)' }}>
                        <button
                            onClick={() => setViewMode('form')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'form'
                                ? 'shadow-sm'
                                : 'hover:bg-[var(--pd-button-hover)]'
                                }`}
                            style={{
                                background: viewMode === 'form' ? 'var(--pd-surface-panel-2)' : 'transparent',
                                color: viewMode === 'form' ? 'var(--pd-text-main)' : 'var(--pd-text-muted)'
                            }}
                        >
                            <span>📝</span>
                            <span>Form</span>
                        </button>
                        <button
                            onClick={() => setViewMode('raw')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'raw'
                                ? 'shadow-sm border'
                                : 'hover:bg-[var(--pd-button-hover)]'
                                }`}
                            style={{
                                background: viewMode === 'raw' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                color: viewMode === 'raw' ? 'var(--pd-danger)' : 'var(--pd-text-muted)',
                                borderColor: viewMode === 'raw' ? 'rgba(239, 68, 68, 0.2)' : 'transparent'
                            }}
                        >
                            <span>🤖</span>
                            <span>Raw</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content with Persistent Top Bar */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden" style={{ background: 'var(--pd-surface-main)' }}>
                {/* 🔴 PowerDirector Fix: Removed 'System Ready' Header Bar */}

                {/* Content Area */}
                {viewMode === 'raw' ? (
                    <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
                        <RawConfigEditor />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <div className="max-w-4xl mx-auto w-full p-6">
                            {children}
                        </div>
                    </div>
                )}

                {/* 🔴 PowerDirector Fix: Persistent Save Bar */}
                <div
                    className={`sticky bottom-0 z-20 py-4 px-8 backdrop-blur flex items-center justify-between transition-all duration-300 border-t ${dirty ? 'translate-y-0 opacity-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]' : 'translate-y-full opacity-0'}`}
                    style={{
                        background: 'color-mix(in srgb, var(--pd-surface-main) 90%, transparent)',
                        borderColor: 'var(--pd-border)'
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold" style={{ color: 'var(--pd-text-main)' }}>You have unsaved changes</span>
                            <span className="text-xs opacity-60" style={{ color: 'var(--pd-text-muted)' }}>
                                {pendingChanges} update{pendingChanges !== 1 ? 's' : ''} pending across configuration
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={refreshConfig}
                            disabled={saving}
                            className="px-5 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-gray-800/50 flex items-center gap-2 border"
                            style={{
                                background: 'var(--pd-surface-panel)',
                                borderColor: 'var(--pd-border)',
                                color: 'var(--pd-text-muted)'
                            }}
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            onClick={saveConfig}
                            disabled={saving}
                            className="px-6 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: 'var(--pd-accent)' }}
                        >
                            {saving ? <span className="animate-spin">⟳</span> : <span>💾</span>}
                            Save Changes
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
    return (
        <ConfigLayoutContent>
            {children}
        </ConfigLayoutContent>
    );
}
