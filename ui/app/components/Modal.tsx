
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    type?: 'default' | 'danger' | 'info';
}

export function Modal({ isOpen, onClose, title, children, footer, type = 'default' }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const headerColor = type === 'danger' ? 'text-red-400' : 'text-[var(--pd-text-main)]';
    const borderColor = type === 'danger' ? 'border-red-500/30' : 'border-[var(--pd-border)]';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className={`w-full max-w-md rounded-lg border shadow-xl bg-[var(--pd-surface-panel)] text-[var(--pd-text-main)] animate-in zoom-in-95 duration-200 ${borderColor}`}
                style={{ borderColor: type === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'var(--pd-border)' }}
            >
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--pd-border)' }}>
                    <h3 className={`font-bold text-lg ${headerColor}`}>{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-[var(--pd-surface-element)] opacity-70 hover:opacity-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>

                {footer && (
                    <div className="flex justify-end gap-3 p-4 border-t bg-[var(--pd-surface-main)]/50 rounded-b-lg" style={{ borderColor: 'var(--pd-border)' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
