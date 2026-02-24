
import React from 'react';

export interface ChannelStatus {
    configured?: boolean;
    running?: boolean;
    connected?: boolean;
    mode?: string;
    lastStartAt?: number;
    lastProbeAt?: number;
    lastError?: string;
    probe?: {
        ok: boolean;
        status?: string;
        error?: string;
    };
}

interface ChannelCardProps {
    id: string;
    label: string;
    description: string;
    status: ChannelStatus;
    children?: React.ReactNode;
    onProbe?: () => void;
}

export function ChannelCard({ id, label, description, status, children, onProbe }: ChannelCardProps) {
    const formatTime = (ts?: number) => {
        if (!ts) return 'n/a';
        const diff = Date.now() - ts;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

    return (
        <div className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] rounded-xl p-5 mb-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-[var(--pd-border-strong)]">
            <h2 className="text-[15px] font-semibold text-[var(--pd-text-main)] mb-1.5 leading-snug tracking-tight">
                {label}
            </h2>
            <p className="text-[13px] text-[var(--pd-text-muted)] mb-5 leading-normal">
                {description}
            </p>

            {/* Status List */}
            <div className="grid gap-2 mb-4">
                <div className="flex justify-between items-center py-2 border-b border-[var(--pd-border)] border-opacity-50">
                    <span className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">Configured</span>
                    <span className="text-[13px] font-medium">{status.configured ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--pd-border)] border-opacity-50">
                    <span className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">Running</span>
                    <span className="text-[13px] font-medium">{status.running ? 'Yes' : 'No'}</span>
                </div>
                {status.mode && (
                    <div className="flex justify-between items-center py-2 border-b border-[var(--pd-border)] border-opacity-50">
                        <span className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">Mode</span>
                        <span className="text-[13px] font-medium">{status.mode}</span>
                    </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-[var(--pd-border)] border-opacity-50">
                    <span className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">Last start</span>
                    <span className="text-[13px] font-medium">{formatTime(status.lastStartAt)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--pd-border)] border-opacity-50">
                    <span className="text-[11px] font-medium text-[var(--pd-text-muted)] uppercase tracking-wide">Last probe</span>
                    <span className="text-[13px] font-medium">{formatTime(status.lastProbeAt)}</span>
                </div>
            </div>

            {/* Probe Status */}
            {status.probe && (
                <div className="mb-4 p-3.5 bg-[var(--pd-surface-sidebar)] rounded-md border border-[var(--pd-border)] text-[13px] leading-relaxed">
                    Probe {status.probe.ok ? 'ok' : 'failed'}
                    {status.probe.status && ` · ${status.probe.status}`}
                    {status.probe.error && ` ${status.probe.error}`}
                </div>
            )}

            {/* Error Callout (General) */}
            {status.lastError && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md text-[13px]">
                    {status.lastError}
                </div>
            )}

            {/* Config Section */}
            <div className="mt-4">
                {children}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3">
                <button
                    onClick={onProbe}
                    className="px-4 py-2 bg-[var(--pd-surface-sidebar)] hover:bg-[var(--pd-button-hover)] border border-[var(--pd-border)] rounded-md text-[13px] font-medium transition-all shadow-sm active:translate-y-[1px]"
                >
                    Probe
                </button>
            </div>
        </div>
    );
}
