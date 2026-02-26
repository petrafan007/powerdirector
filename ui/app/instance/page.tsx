'use client';

import { useState, useEffect } from 'react';

export default function InstancePage() {
    const [info, setInfo] = useState<any>(null);

    useEffect(() => {
        fetch('/api/system/info')
            .then(res => res.json())
            .then(data => setInfo(data));
    }, []);

    if (!info) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Instance Configuration</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[var(--pd-surface-panel)] border border-[var(--pd-border)]">
                    <h3 className="font-bold mb-2">Environment</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="opacity-70">NODE_ENV:</span>
                        <span>{info.env}</span>
                        <span className="opacity-70">App Version:</span>
                        <span>{info.version}</span>
                        <span className="opacity-70">Node Version:</span>
                        <span>{info.nodeVersion}</span>
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-[var(--pd-surface-panel)] border border-[var(--pd-border)]">
                    <h3 className="font-bold mb-2">Hardware</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="opacity-70">Platform:</span>
                        <span>{info.platform} ({info.arch})</span>
                        <span className="opacity-70">CPU:</span>
                        <span>{info.cpu} ({info.cores} cores)</span>
                        <span className="opacity-70">Memory:</span>
                        <span>{Math.round(info.memory / 1024 / 1024 / 1024)} GB</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
