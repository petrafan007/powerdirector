'use client';

import { useState, useEffect } from 'react';

interface DialogProps {
    isOpen: boolean;
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    type: 'alert' | 'confirm' | 'prompt';
    onConfirm: (value?: string) => void;
    onCancel: () => void;
}

export default function Dialog({
    isOpen,
    title,
    message,
    placeholder,
    defaultValue,
    type,
    onConfirm,
    onCancel
}: DialogProps) {
    const [value, setValue] = useState(defaultValue || '');

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue || '');
        }
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-sm rounded-2xl shadow-2xl border animate-in fade-in zoom-in duration-200"
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

                    {type === 'prompt' && (
                        <div className="mb-6">
                            <input
                                autoFocus
                                type="text"
                                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                style={{
                                    background: 'var(--pd-surface-panel)',
                                    borderColor: 'var(--pd-border)',
                                    color: 'var(--pd-text-main)'
                                }}
                                placeholder={placeholder}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onConfirm(value);
                                    if (e.key === 'Escape') onCancel();
                                }}
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 mt-4">
                        {(type === 'confirm' || type === 'prompt') && (
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                                style={{ color: 'var(--pd-text-muted)' }}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={() => onConfirm(type === 'prompt' ? value : undefined)}
                            className="px-6 py-2 text-sm font-bold text-white rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
                            style={{ background: 'var(--pd-accent)' }}
                        >
                            {type === 'confirm' ? 'Confirm' : type === 'prompt' ? 'Create' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
