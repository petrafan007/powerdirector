// AUTOMATICALLY GENERATED Documentation Component for wizard
import React from 'react';

export default function WizardConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">{`Setup Wizard Configuration`}</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">{`The Setup Wizard tracks whether the initial 'First Run' configuration has been completed. This is primarily an internal flag, though resetting it allows you to trigger the onboarding flow again for a fresh configuration state.`}</p>
            </div>
            <div className="space-y-6">
                <div id="wizard.lastRunAt" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Last Run At`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`wizard.lastRunAt`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`string`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>An ISO-8601 formatted timestamp indicating exactly when the Setup Wizard was last successfully completed. If this value is empty or null, the system assumes the server is booting for the first time and will globally redirect the first accessing user to the setup flow. Deleting this value acts as a factory reset for the onboarding state.</p>
                    </div>
                </div>
                <div id="wizard.lastRunVersion" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Last Run Version`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`wizard.lastRunVersion`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`string`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>The semantic version string (e.g., `v1.2.4`) of PowerDirector that was running when the wizard was completed. This is crucial for internal migration scripts; if the server boots up with a newer package version than what is recorded here, it will automatically trigger intermediate database or file-system migrations to bring the older setup up to standard.</p>
                    </div>
                </div>
                <div id="wizard.lastRunCommit" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Last Run Commit`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`wizard.lastRunCommit`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`string`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>The Git SHA hash corresponding to the specific build of PowerDirector during the initial setup. Used strictly for remote diagnostics and debugging by the support team when submitting issues regarding setup failures.</p>
                    </div>
                </div>
                <div id="wizard.lastRunCommand" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Last Run Command`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`wizard.lastRunCommand`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`string`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>The shell command payload that initiated the wizard via the CLI (e.g. `npx powerdirector setup`). This payload is stored for forensic auditing and to ensure repeated identical provisioning via orchestrated scripts (like Ansible) doesn't endlessly overwrite existing instances.</p>
                    </div>
                </div>
                <div id="wizard.lastRunMode" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Last Run Mode`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`wizard.lastRunMode`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`Enum: local | remote | cloud`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>Specifies the topological target the wizard configured the instance for. `local` implies a single-machine database bind (SQLite), `remote` assumes a clustered peer network requiring Gateway routing, and `cloud` expects managed AWS/GCP dependencies.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
