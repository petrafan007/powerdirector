// AUTOMATICALLY GENERATED Documentation Component for update
import React from 'react';

export default function UpdateConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">{`Updates Configuration`}</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">{`System updates are managed via this module, determining which release channel (stable, beta, nightly) your PowerDirector instance tracks. It also controls whether the system performs automated version checks upon booting up.`}</p>
            </div>
            <div className="space-y-6">
                <div id="update.channel" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Release Channel`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`update.channel`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`Enum: stable | beta | dev | nightly`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>Determines which upstream branch the internal updater watches for new package releases. `stable` maps strictly to production tags. `beta` provides early access to stable candidates. `nightly` downloads bleeding-edge, potentially unstable builds generated dynamically every 24 hours. Enterprise users should strictly utilize `stable` to avoid unexpected schema collisions.</p>
                    </div>
                </div>
                <div id="update.checkOnStart" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Check On Start`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`update.checkOnStart`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`boolean`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>A global toggle that dictates whether the Gateway server initiates a `git fetch` or `npm update` upstream check the moment the node process boots. Setting this to `true` is convenient for single-node setups, but setting it to `false` is mandatory for highly-scalable multi-node topologies to prevent Thundering Herd DDoSing on the package registry during massive orchestration scale-outs.</p>
                    </div>
                </div>
                <div id="update.autoInstall" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Auto Install Updates`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`update.autoInstall`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`boolean`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>When combined with `checkOnStart` or the background updater Cron Job, this flag dictates whether the system will autonomously rip-and-replace the live executable. If `true`, the system will download the patch, compile if necessary, automatically gracefully shut down the Gateway, and reboot. Use with major caution in production, as autonomous installations skip manual verification checkpoints.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
