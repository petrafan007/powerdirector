// AUTOMATICALLY GENERATED Documentation Component for auth
import React from 'react';

export default function AuthConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">{`Authentication Configuration`}</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">{`Authentication is the security perimeter for PowerDirector. This module allows you to define strict API cooldowns to prevent abuse, organize authentication profiles (like Google or native tokens), and dictate the priority order of fallback authenticators.`}</p>
            </div>
            <div className="space-y-6">
                <div id="auth.profiles" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Auth Profiles`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`auth.profiles`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`record`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>A dictionary of named authentication strategies supporting the system. Keys typically represent providers (e.g., <code>google</code>, <code>minimax</code>, <code>native</code>) and values represent their specific token, secret, and client-id payloads. For details on integrating OAuth such as Minimax Portal Auth, see external documentation on OAuth 2 flows.</p>
                    </div>
                </div>
                <div id="auth.order" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Auth Order`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`auth.order`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`record`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>Dictates the fallback priority ranking for authentication middleware. If a user tries to access a protected Web Gateway layer and fails the Rank 1 auth strategy, the system immediately cascades them to Rank 2, and so on. For instance, setting <code>{`{"native": 1, "google": 2 }`}</code> means local DB tokens are checked before initiating an SSO redirect.</p>
                    </div>
                </div>
                <div id="auth.cooldowns" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Auth Cooldowns`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`auth.cooldowns`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`object`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>A safety-critical wrapper object defining exact timing thresholds to prevent brute-force attacks and API cost overruns. Modifying values in this block inherently alters how quickly a user or IP can continually hit the frontend login router or backend API layer before being completely blackholed.</p>
                    </div>
                </div>
                <div id="auth.cooldowns.billingBackoffHours" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Billing Backoff Hours`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`auth.cooldowns.billingBackoffHours`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`number`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>A global API defense mechanism. If a specific user organization inherently fails to process an active billing token (e.g., Stripe subscription expired), this field dictates how many hours the system will refuse subsequent queries from that entire sub-tenant to save server compute cycles. Standard value is usually `24`.</p>
                    </div>
                </div>
                <div id="auth.cooldowns.billingBackoffHoursByProvider" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Billing Backoff Hours By Provider`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`auth.cooldowns.billingBackoffHoursByProvider`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`record`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>Overrides the global <code>billingBackoffHours</code> limit, explicitly mapping unique cooldown timers to individual upstream model providers. For example, AWS Bedrock might mandate a 2-hour backoff upon limit caps, whereas OpenAI might require a `12` hour backoff. Keying them here ensures precision rate limiting.</p>
                    </div>
                </div>
                <div id="auth.cooldowns.billingMaxHours" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Billing Max Hours`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`auth.cooldowns.billingMaxHours`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`number`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>The absolute ceiling limit for any exponentially grown backoff timer. If a user continually hits the gateway despite being in a backoff cooldown window, the system doubles their punishment time. This parameter enforces a maximum cap so users aren't permanently locked out of their accounts for trivial automated script errors.</p>
                    </div>
                </div>
                <div id="auth.cooldowns.failureWindowHours" className="bg-[var(--pd-surface-panel)] border border-[var(--pd-border)] p-6 rounded-xl shadow-sm hover:border-[var(--pd-blue-500)] transition-colors scroll-mt-24">
                    <h3 className="font-sans text-xl font-bold mt-0 mb-3 text-[var(--pd-text-main)]">{`Failure Window Hours`}</h3>
                    <div className="flex flex-wrap gap-3 mb-4 text-xs font-mono opacity-80">
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Path: <span className="text-[var(--pd-text-main)] font-semibold">{`auth.cooldowns.failureWindowHours`}</span></span>
                        <span className="bg-[var(--pd-surface-hover)] border border-[var(--pd-border)] px-3 py-1.5 rounded">Type: <span className="text-[var(--pd-text-main)] font-semibold">{`number`}</span></span>
                    </div>
                    <div className="text-[0.95rem] text-[var(--pd-text-muted)] m-0 leading-relaxed font-normal">
                        <p>Controls the rolling window in which failed authentication attempts are aggregated. If your lockout threshold is set to 5 failures, and this window is set to `1` hour, a bot attempting 5 identical bad passwords within that 60-minute frame triggers the banhammer state.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
