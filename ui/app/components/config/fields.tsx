'use client';

import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════
// TOGGLE
// ═══════════════════════════════════════════════════════════
interface ToggleFieldProps {
    label: string;
    description?: string;
    value: boolean;
    onChange: (val: boolean) => void;
}

export function ToggleField({ label, description, value, onChange }: ToggleFieldProps) {
    return (
        <div className="flex items-center justify-between py-3 px-1 group">
            <div className="flex-1 mr-4">
                <div className="text-sm font-medium" style={{ color: 'var(--pd-text-main)' }}>{label}</div>
                {description && <div className="text-xs mt-0.5" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={() => onChange(!value)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: value ? 'var(--pd-accent)' : 'var(--pd-surface-panel-2)' }}
            >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// SELECT
// ═══════════════════════════════════════════════════════════
interface SelectFieldProps {
    label: string;
    description?: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
}

export function SelectField({ label, description, value, options, onChange }: SelectFieldProps) {
    return (
        <div className="py-3 px-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</label>
            {description && <div className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                style={{
                    background: 'var(--pd-surface-panel)',
                    border: '1px solid var(--pd-border)',
                    color: 'var(--pd-text-main)'
                }}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// NUMBER
// ═══════════════════════════════════════════════════════════
interface NumberFieldProps {
    label: string;
    description?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (val: number | undefined) => void;
}

export function NumberField({ label, description, value, min, max, step, onChange }: NumberFieldProps) {
    const [inputValue, setInputValue] = useState(value === undefined ? '' : String(value));

    useEffect(() => {
        setInputValue(value === undefined ? '' : String(value));
    }, [value]);

    return (
        <div className="py-3 px-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</label>
            {description && <div className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
            <div className="flex items-center gap-3">
                <input
                    type="number"
                    value={inputValue}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(e) => {
                        const next = e.target.value;
                        setInputValue(next);
                        if (next.trim() === '') {
                            onChange(undefined);
                            return;
                        }
                        const parsed = Number(next);
                        if (Number.isFinite(parsed)) {
                            onChange(parsed);
                        }
                    }}
                    className="w-32 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{
                        background: 'var(--pd-surface-panel)',
                        border: '1px solid var(--pd-border)',
                        color: 'var(--pd-text-main)'
                    }}
                />
                {(min !== undefined || max !== undefined) && (
                    <span className="text-xs" style={{ color: 'var(--pd-text-muted)' }}>
                        {min !== undefined && `min: ${min}`}{min !== undefined && max !== undefined && ' · '}{max !== undefined && `max: ${max}`}
                    </span>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// TEXT
// ═══════════════════════════════════════════════════════════
interface TextFieldProps {
    label: string;
    description?: string;
    value: string;
    placeholder?: string;
    multiline?: boolean;
    onChange: (val: string) => void;
}

export function TextField({ label, description, value, placeholder, multiline, onChange }: TextFieldProps) {
    const inputStyle = {
        background: 'var(--pd-surface-panel)',
        border: '1px solid var(--pd-border)',
        color: 'var(--pd-text-main)'
    };
    const baseClass = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    return (
        <div className="py-3 px-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</label>
            {description && <div className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
            {multiline ? (
                <textarea
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    rows={4}
                    className={baseClass + " resize-y"}
                    style={inputStyle}
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseClass}
                    style={inputStyle}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// MASKED (for secret fields like API keys)
// ═══════════════════════════════════════════════════════════
interface MaskedFieldProps {
    label: string;
    description?: string;
    value: string;
    placeholder?: string;
    onChange: (val: string) => void;
}

export function MaskedField({ label, description, value, placeholder, onChange }: MaskedFieldProps) {
    const [revealed, setRevealed] = useState(false);

    return (
        <div className="py-3 px-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</label>
            {description && <div className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
            <div className="relative">
                <input
                    type={revealed ? 'text' : 'password'}
                    value={value}
                    placeholder={placeholder || '••••••••'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    style={{
                        background: 'var(--pd-surface-panel)',
                        border: '1px solid var(--pd-border)',
                        color: 'var(--pd-text-main)'
                    }}
                />
                <button
                    type="button"
                    onClick={() => setRevealed(!revealed)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded transition-colors cursor-pointer"
                    style={{ color: 'var(--pd-text-muted)' }}
                >
                    {revealed ? 'Hide' : 'Show'}
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// LIST (array of strings)
// ═══════════════════════════════════════════════════════════
interface ListFieldProps {
    label: string;
    description?: string;
    value: string[];
    placeholder?: string;
    onChange: (val: string[]) => void;
}

export function ListField({ label, description, value, placeholder, onChange }: ListFieldProps) {
    const [newItem, setNewItem] = useState('');
    const items = value || [];

    const addItem = () => {
        if (newItem.trim()) {
            onChange([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="py-3 px-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</label>
            {description && <div className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
            <div className="space-y-2">
                {items.map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 group"
                        style={{ background: 'var(--pd-surface-panel)' }}
                    >
                        <span className="flex-1 text-sm font-mono truncate" style={{ color: 'var(--pd-text-main)' }}>{item}</span>
                        <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                            ✕
                        </button>
                    </div>
                ))}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newItem}
                        placeholder={placeholder || 'Add item...'}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                        className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{
                            background: 'var(--pd-surface-panel)',
                            border: '1px solid var(--pd-border)',
                            color: 'var(--pd-text-main)'
                        }}
                    />
                    <button
                        type="button"
                        onClick={addItem}
                        className="px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
                        style={{
                            background: 'var(--pd-surface-panel-2)',
                            color: 'var(--pd-text-main)'
                        }}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// MAP (record of key→value strings)
// ═══════════════════════════════════════════════════════════
interface MapFieldProps {
    label: string;
    description?: string;
    value: Record<string, any>;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    onChange: (val: Record<string, any>) => void;
}

export function MapField({ label, description, value, keyPlaceholder, valuePlaceholder, onChange }: MapFieldProps) {
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const entries = Object.entries(value || {});

    const addEntry = () => {
        if (newKey.trim()) {
            onChange({ ...value, [newKey.trim()]: newValue });
            setNewKey('');
            setNewValue('');
        }
    };

    const removeEntry = (key: string) => {
        const next = { ...value };
        delete next[key];
        onChange(next);
    };

    const inputStyle = {
        background: 'var(--pd-surface-panel)',
        border: '1px solid var(--pd-border)',
        color: 'var(--pd-text-main)'
    };

    return (
        <div className="py-3 px-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</label>
            {description && <div className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
            <div className="space-y-2">
                {entries.map(([k, v]) => (
                    <div
                        key={k}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 group"
                        style={{ background: 'var(--pd-surface-panel)' }}
                    >
                        <span className="text-sm font-mono" style={{ color: 'var(--pd-accent)' }}>{k}</span>
                        <span style={{ color: 'var(--pd-text-muted)' }}>=</span>
                        <span className="flex-1 text-sm font-mono truncate" style={{ color: 'var(--pd-text-main)' }}>
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                        <button
                            type="button"
                            onClick={() => removeEntry(k)}
                            className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                            ✕
                        </button>
                    </div>
                ))}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newKey}
                        placeholder={keyPlaceholder || 'Key'}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="w-1/3 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        style={inputStyle}
                    />
                    <input
                        type="text"
                        value={newValue}
                        placeholder={valuePlaceholder || 'Value'}
                        onChange={(e) => setNewValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEntry())}
                        className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        style={inputStyle}
                    />
                    <button
                        type="button"
                        onClick={addEntry}
                        className="px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
                        style={{
                            background: 'var(--pd-surface-panel-2)',
                            color: 'var(--pd-text-main)'
                        }}
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// JSON (arbitrary object/array payloads)
// ═══════════════════════════════════════════════════════════
interface JsonFieldProps {
    label: string;
    description?: string;
    value: any;
    rows?: number;
    onChange: (val: any) => void;
}

export function JsonField({ label, description, value, rows = 10, onChange }: JsonFieldProps) {
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            setText(JSON.stringify(value ?? {}, null, 2));
            setError(null);
        } catch {
            setText(String(value ?? ''));
        }
    }, [value]);

    return (
        <div className="py-3 px-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--pd-text-main)' }}>{label}</label>
            {description && <div className="text-xs mb-2" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
            <textarea
                value={text}
                rows={rows}
                onChange={(e) => {
                    const next = e.target.value;
                    setText(next);
                    try {
                        const parsed = JSON.parse(next);
                        onChange(parsed);
                        setError(null);
                    } catch (err) {
                        setError((err as Error).message);
                    }
                }}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{
                    background: 'var(--pd-surface-panel)',
                    border: '1px solid var(--pd-border)',
                    color: 'var(--pd-text-main)'
                }}
                spellCheck={false}
            />
            {error && (
                <div className="mt-2 text-xs text-red-400">
                    Invalid JSON: {error}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// GROUP (collapsible nested section)
// ═══════════════════════════════════════════════════════════
interface GroupFieldProps {
    label: string;
    description?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export function GroupField({ label, description, defaultOpen = false, children }: GroupFieldProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="py-2 px-1">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors group cursor-pointer"
                style={{ color: 'var(--pd-text-main)' }}
            >
                <div className="text-left">
                    <div className="text-sm font-semibold flex items-center gap-2">
                        <span className={`text-xs transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
                        {label}
                    </div>
                    {description && <div className="text-xs mt-0.5 ml-5" style={{ color: 'var(--pd-text-muted)' }}>{description}</div>}
                </div>
            </button>
            {open && (
                <div className="ml-5 pl-3 mt-1 space-y-1" style={{ borderLeft: '1px solid var(--pd-border)' }}>
                    {children}
                </div>
            )}
        </div>
    );
}
