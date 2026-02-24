// AUTOMATICALLY GENERATED Documentation Component for web
import React from 'react';

const WEB_CONFIGS = [
    {
        path: 'web.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles whether the physical PowerDirector Core responds to native Web UI Thin Client connection requests or rigorously denies them to save RAM.'
    },
    {
        path: 'web.heartbeatSeconds',
        label: 'Heartbeat Seconds',
        type: 'number',
        description: 'Interval at which the backend explicitly sends a microscopic WebSocket `ping` payload to the browser. If the browser fails to `pong` back, the server assumes the user closed the laptop lid and terminates the socket.'
    },
    {
        path: 'web.reconnect',
        label: 'Reconnect',
        type: 'object',
        description: 'Defines the algorithmic exponential backoff curve the React frontend employs when trying to re-establish a dropped WebSocket connection.'
    },
    {
        path: 'web.reconnect.initialMs',
        label: 'Initial Ms',
        type: 'number',
        description: 'The agonizingly short immediate delay before the very first reconnection attempt is fired.'
    },
    {
        path: 'web.reconnect.maxMs',
        label: 'Max Ms',
        type: 'number',
        description: 'The absolute ceiling on the exponential backoff curve. Prevents the frontend from waiting 5 hours between attempts.'
    },
    {
        path: 'web.reconnect.factor',
        label: 'Factor',
        type: 'number',
        description: 'The mathematical multiplier applied to the delay after each failed attempt (e.g. `2.0` doubles the wait time).'
    },
    {
        path: 'web.reconnect.jitter',
        label: 'Jitter',
        type: 'boolean',
        description: 'Highly crucial for Enterprise deployments. If `true`, adds slight cryptographic randomness to the reconnect timers so that if the core server crashes and reboots, 10,000 browsers don\'t all violently hammer the `/ws` endpoint at the exact same millisecond.'
    },
    {
        path: 'web.reconnect.maxAttempts',
        label: 'Max Attempts',
        type: 'number',
        description: 'The terminal threshold where the GUI physically gives up and tells the user to frantically refresh the page manually.'
    }
];

export default function WebConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Thin Client Parameters Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Microscopic tuning controls governing the physical WebSockets connecting user browsers to the node server. Defines exactly how fiercely the UI attempts to reconnect when entering subway tunnels or dropping Wi-Fi.</p>
            </div>
            <div className="space-y-6">
                {WEB_CONFIGS.map((config) => (
                    <div key={config.path} id={config.path} className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                        <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{config.label}</h3>
                        <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Path: <span className="text-[var(--pd-text-main)] font-semibold">{config.path}</span>
                            </span>
                            <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">
                                Type: <span className="text-[var(--pd-text-main)] font-semibold">{config.type}</span>
                            </span>
                        </div>
                        <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                            <p>{config.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
