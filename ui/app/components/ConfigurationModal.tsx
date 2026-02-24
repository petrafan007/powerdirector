
import React, { useState, useEffect } from 'react';

interface ConfigurationModalProps {
    channel: any;
    onClose: () => void;
    onSave: (id: string, config: any) => Promise<void>;
}

export function ConfigurationModal({ channel, onClose, onSave }: ConfigurationModalProps) {
    const [config, setConfig] = useState<any>(channel.config || {});
    const [saving, setSaving] = useState(false);

    const updateField = (key: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(channel.id, config);
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[var(--pd-surface-main)] border border-[var(--pd-border)] rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]" style={{ color: 'var(--pd-text-main)' }}>
                <div className="flex justify-between items-center p-4 border-b border-[var(--pd-border)]">
                    <h2 className="text-xl font-bold">Configure {channel.name}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-[var(--pd-button-hover)] rounded transition-colors">✕</button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    {/* Dynamic Fields based on Channel Type */}
                    {channel.id === 'telegram' && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium opacity-80">Bot Token</label>
                                <input
                                    type="text"
                                    value={config.botToken || ''}
                                    onChange={(e) => updateField('botToken', e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--pd-input-bg)] border border-[var(--pd-border)] rounded text-sm focus:outline-none focus:border-[var(--pd-accent)] transition-colors"
                                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                />
                                <p className="text-xs text-[var(--pd-text-muted)]">From @BotFather</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium opacity-80">Allowed User IDs</label>
                                <input
                                    type="text"
                                    value={Array.isArray(config.allowFrom) ? config.allowFrom.join(', ') : ''}
                                    onChange={(e) => updateField('allowFrom', e.target.value.split(',').map((s: string) => s.trim()))}
                                    className="w-full px-3 py-2 bg-[var(--pd-input-bg)] border border-[var(--pd-border)] rounded text-sm focus:outline-none focus:border-[var(--pd-accent)] transition-colors"
                                    placeholder="12345678, 87654321"
                                />
                                <p className="text-xs text-[var(--pd-text-muted)]">Comma separated list of allowed Telegram user IDs.</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium opacity-80">Group Policy</label>
                                <select
                                    value={config.groupPolicy || 'allowlist'}
                                    onChange={(e) => updateField('groupPolicy', e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--pd-input-bg)] border border-[var(--pd-border)] rounded text-sm focus:outline-none focus:border-[var(--pd-accent)] transition-colors"
                                >
                                    <option value="allowlist">Allowlist Only</option>
                                    <option value="public">Public (Any Group)</option>
                                    <option value="deny">Deny All Groups</option>
                                </select>
                            </div>
                        </>
                    )}

                    {channel.id === 'discord' && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium opacity-80">Bot Token</label>
                            <input
                                type="text"
                                value={config.token || ''}
                                onChange={(e) => updateField('token', e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--pd-input-bg)] border border-[var(--pd-border)] rounded text-sm focus:outline-none focus:border-[var(--pd-accent)] transition-colors"
                            />
                            <p className="text-xs text-[var(--pd-text-muted)]">From Discord Developer Portal</p>
                        </div>
                    )}

                    {channel.id === 'slack' && (
                        <>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium opacity-80">Bot User OAuth Token</label>
                                <input
                                    type="text"
                                    value={config.token || ''}
                                    onChange={(e) => updateField('token', e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--pd-input-bg)] border border-[var(--pd-border)] rounded text-sm focus:outline-none focus:border-[var(--pd-accent)] transition-colors"
                                    placeholder="xoxb-..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium opacity-80">App Level Token</label>
                                <input
                                    type="text"
                                    value={config.appToken || ''}
                                    onChange={(e) => updateField('appToken', e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--pd-input-bg)] border border-[var(--pd-border)] rounded text-sm focus:outline-none focus:border-[var(--pd-accent)] transition-colors"
                                    placeholder="xapp-..."
                                />
                            </div>
                        </>
                    )}

                    {/* Generic Editor */}
                    <div className="space-y-1.5 pt-4 border-t border-[var(--pd-border)]">
                        <label className="text-sm font-medium opacity-80">Advanced / Raw Config</label>
                        <textarea
                            value={JSON.stringify(config, null, 2)}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    setConfig(parsed);
                                } catch (e) {
                                    // ignore invalid json while typing
                                }
                            }}
                            className="w-full h-40 px-3 py-2 bg-[var(--pd-input-bg)] border border-[var(--pd-border)] rounded text-sm font-mono focus:outline-none focus:border-[var(--pd-accent)] transition-colors text-xs"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-[var(--pd-border)] bg-[var(--pd-surface-sidebar)]/30 flex justify-end gap-3 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-sm hover:bg-[var(--pd-button-hover)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-[var(--pd-accent)] hover:brightness-110 text-white rounded text-sm font-medium transition-all shadow-lg shadow-[var(--pd-accent)]/20 disabled:opacity-50 disabled:shadow-none"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
