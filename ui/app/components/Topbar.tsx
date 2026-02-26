'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../config/SettingsContext';

interface TopbarProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export default function Topbar({ collapsed, onToggleCollapse }: TopbarProps) {
    const { config, updateConfig } = useSettings();
    const [themeOpen, setThemeOpen] = useState(false);
    const themeRef = useRef<HTMLDivElement>(null);

    const currentTheme = config?.ui?.theme || 'system';

    // Close dropdown on click outside
    useEffect(() => {
        if (!themeOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
                setThemeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [themeOpen]);

    const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
        updateConfig('ui.theme', theme);
        setThemeOpen(false);
    };

    // Icons
    const HamburgerIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );

    const SunIcon = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );

    const MoonIcon = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );

    const SystemIcon = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
    );

    const getThemeIcon = (t: string) => {
        if (t === 'light') return <SunIcon />;
        if (t === 'dark') return <MoonIcon />;
        return <SystemIcon />;
    };

    return (
        <div
            className="flex items-center justify-between px-4 h-14 border-b shrink-0 z-50"
            style={{
                background: 'var(--pd-surface-sidebar)', // Use sidebar surface for topbar? Or separate? 
                // Usually Topbar is distinct or same as sidebar. Let's stick with sidebar color for now or specific variables if requested.
                // User said "separate from the sidebar". Let's use correct semantic variables.
                // In globals.css we have --pd-surface-sidebar. Let's use that for now, or main.
                // Actually, standard dashboard often uses white/dark-blue.
                // Let's us --pd-surface-sidebar to match the "frame" feel.
                backgroundColor: 'var(--pd-surface-sidebar)',
                borderColor: 'var(--pd-border)',
                color: 'var(--pd-text-main)'
            }}
        >
            {/* Left: Hamburger + Title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleCollapse}
                    className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--pd-button-hover)]"
                    style={{ color: 'var(--pd-text-muted)' }}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <HamburgerIcon />
                </button>

                <div className="flex flex-col leading-tight">
                    <div className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                        <span className="text-red-500 text-lg">♦</span> {/* Placeholder Logo Icon */}
                        POWERDIRECTOR
                    </div>
                    <div className="text-[10px] uppercase tracking-widest pl-6" style={{ color: 'var(--pd-text-muted)' }}>
                        Gateway Dashboard
                    </div>
                </div>
            </div>

            {/* Right: Status + Theme */}
            <div className="flex items-center gap-6">
                {/* Status */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm" style={{
                    backgroundColor: 'var(--pd-surface-panel)',
                    borderColor: 'var(--pd-border)',
                    color: 'var(--pd-text-main)'
                }}>
                    <div className="w-2 h-2 rounded-full bg-[var(--pd-success)] animate-pulse" />
                    <span className="text-xs font-medium">Healthy OK</span>
                </div>

                {/* Theme Toggle */}
                <div className="relative" ref={themeRef}>
                    <button
                        onClick={() => setThemeOpen(!themeOpen)}
                        className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-[var(--pd-button-hover)] border border-transparent hover:border-[var(--pd-border)]"
                        title="Toggle Theme"
                    >
                        {getThemeIcon(currentTheme)}
                    </button>

                    {themeOpen && (
                        <div
                            className="absolute right-0 top-full mt-2 w-32 rounded-xl shadow-xl border overflow-hidden py-1"
                            style={{
                                background: 'var(--pd-surface-panel-2)',
                                borderColor: 'var(--pd-border)',
                                zIndex: 100
                            }}
                        >
                            {[
                                { id: 'light', label: 'Light', icon: <SunIcon /> },
                                { id: 'dark', label: 'Dark', icon: <MoonIcon /> },
                                { id: 'system', label: 'Auto', icon: <SystemIcon /> }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleThemeChange(opt.id as any)}
                                    className="w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-[var(--pd-button-hover)] transition-colors"
                                    style={{
                                        color: currentTheme === opt.id ? 'var(--pd-accent)' : 'var(--pd-text-main)',
                                        fontWeight: currentTheme === opt.id ? 'bold' : 'normal'
                                    }}
                                >
                                    {opt.icon}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
