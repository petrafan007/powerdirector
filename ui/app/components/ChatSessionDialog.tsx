'use client';

import { useEffect, useMemo, useState } from 'react';

interface ChatSessionDialogPayload {
    name: string;
    customInstructions: string;
}

interface ChatSessionDialogProps {
    isOpen: boolean;
    title: string;
    message?: string;
    confirmLabel: string;
    namePlaceholder?: string;
    defaultName?: string;
    defaultCustomInstructions?: string;
    onConfirm: (payload: ChatSessionDialogPayload) => void;
    onCancel: () => void;
}

export default function ChatSessionDialog({
    isOpen,
    title,
    message,
    confirmLabel,
    namePlaceholder,
    defaultName,
    defaultCustomInstructions,
    onConfirm,
    onCancel
}: ChatSessionDialogProps) {
    const [name, setName] = useState(defaultName || '');
    const [customInstructions, setCustomInstructions] = useState(defaultCustomInstructions || '');

    useEffect(() => {
        if (!isOpen) return;
        setName(defaultName || '');
        setCustomInstructions(defaultCustomInstructions || '');
    }, [isOpen, defaultName, defaultCustomInstructions]);

    const canSubmit = useMemo(() => name.trim().length > 0, [name]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            <div
                className="relative w-full max-w-lg rounded-2xl shadow-2xl border animate-in fade-in zoom-in duration-200"
                style={{
                    background: 'var(--pd-surface-sidebar)',
                    borderColor: 'var(--pd-border)',
                    color: 'var(--pd-text-main)'
                }}
            >
                <div className="p-6">
                    <h3 className="text-lg font-bold mb-2">{title}</h3>
                    {message && (
                        <p className="text-sm mb-4" style={{ color: 'var(--pd-text-muted)' }}>
                            {message}
                        </p>
                    )}

                    <div className="mb-4">
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--pd-text-muted)' }}>
                            Chat Name
                        </label>
                        <input
                            autoFocus
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                            style={{
                                background: 'var(--pd-surface-panel)',
                                borderColor: 'var(--pd-border)',
                                color: 'var(--pd-text-main)'
                            }}
                            placeholder={namePlaceholder || 'Chat name...'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
                                    onConfirm({
                                        name: name.trim(),
                                        customInstructions: customInstructions.trim()
                                    });
                                }
                                if (e.key === 'Escape') onCancel();
                            }}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--pd-text-muted)' }}>
                            Custom Instructions
                        </label>
                        <textarea
                            rows={5}
                            className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-y min-h-[120px]"
                            style={{
                                background: 'var(--pd-surface-panel)',
                                borderColor: 'var(--pd-border)',
                                color: 'var(--pd-text-main)'
                            }}
                            placeholder="Optional session-specific instructions for the agent..."
                            value={customInstructions}
                            onChange={(e) => setCustomInstructions(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onCancel();
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-4">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                            style={{ color: 'var(--pd-text-muted)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm({
                                name: name.trim(),
                                customInstructions: customInstructions.trim()
                            })}
                            disabled={!canSubmit}
                            className="px-6 py-2 text-sm font-bold text-white rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                            style={{ background: 'var(--pd-accent)' }}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
