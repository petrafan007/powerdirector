// AUTOMATICALLY GENERATED Documentation Component for discovery
import React from 'react';

const DISCOVERY_CONFIGS = [
    {
        path: 'discovery.wideArea',
        label: 'Wide Area',
        type: 'object',
        description: 'Advanced DNS-SD (Service Discovery) configuration specifically targeted at enterprise Wide Area Networks (WANs) rather than consumer subnets.'
    },
    {
        path: 'discovery.wideArea.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'If `true`, PowerDirector actively reaches out to explicitly defined upstream DNS resolvers mapping TXT and SRV records to discover other remote clustered Agents across massive routed networks.'
    },
    {
        path: 'discovery.mdns',
        label: 'Mdns',
        type: 'object',
        description: 'Classic Multicast DNS configuration (Apple Bonjour / Avahi) for zero-configuration auto-discovery on a flat local LAN switch.'
    },
    {
        path: 'discovery.mdns.mode',
        label: 'Mode',
        type: 'string',
        description: 'Determines whether this PowerDirector Instance actively broadcasts its own presence (`_powerdirector._tcp.local`) to the network, or if it purely passively listens for other floating nodes without revealing itself.'
    }
];

export default function DiscoveryConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">MDNS Auto-discovery Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Host-level parameters dictating how multiple physical PowerDirector instances dynamically find and pair with each other across localized flat LAN switches and massive Enterprise routing setups.</p>
            </div>
            <div className="space-y-6">
                {DISCOVERY_CONFIGS.map((config) => (
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
