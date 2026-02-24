// AUTOMATICALLY GENERATED Documentation Component for browser
import React from 'react';

const BROWSER_CONFIGS = [
    {
        path: 'browser.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Global master toggle governing whether PowerDirector is permitted to natively boot internal Puppeteer/Playwright Chromium instances to execute complex headless web scraping and GUI automation workflows.'
    },
    {
        path: 'browser.evaluateEnabled',
        label: 'Evaluate Enabled',
        type: 'boolean',
        description: 'Highly dangerous. If `true`, permits the LLM to actively inject and execute raw, self-written JavaScript (`page.evaluate()`) directly into the target webpage DOM. Mandatory for clicking complex React buttons or bypassing captchas.'
    },
    {
        path: 'browser.cdpUrl',
        label: 'Cdp Url',
        type: 'string',
        description: 'Chrome DevTools Protocol (CDP) WebSocket endpoint (e.g., `ws://127.0.0.1:9222/devtools/`). If provided, PowerDirector will entirely skip booting a local browser and instead remotely hijack an existing browser instance running elsewhere.'
    },
    {
        path: 'browser.remoteCdpTimeoutMs',
        label: 'Remote Cdp Timeout Ms',
        type: 'number',
        description: 'Absolute threshold defining how long PowerDirector will wait when attempting to execute a page action (like clicking a selector) over a remote CDP WebSocket before giving up and throwing a timeout error to the Agent.'
    },
    {
        path: 'browser.remoteCdpHandshakeTimeoutMs',
        label: 'Remote Cdp Handshake Timeout Ms',
        type: 'number',
        description: 'Initial connection threshold specifying how long the system will attempt to establish the base TCP/WebSocket link to the remote browser cluster before declaring the remote node dead.'
    },
    {
        path: 'browser.color',
        label: 'Color',
        type: 'Enum: yes | no | auto',
        description: 'Dictates whether the underlying Chromium instance explicitly forces `prefers-color-scheme: dark` or `light` media queries when rendering the page. Crucial for agents relying on visual screenshots instead of raw DOM scraping.'
    },
    {
        path: 'browser.executablePath',
        label: 'Executable Path',
        type: 'string',
        description: 'Absolute Linux/OS directory path strictly pointing to a pre-installed physical browser binary (e.g. `/usr/bin/google-chrome-stable`). Required on slim Alpine Docker images where Puppeteer cannot natively download Chrome.'
    },
    {
        path: 'browser.headless',
        label: 'Headless',
        type: 'boolean',
        description: 'If `true`, Chromium boots invisibly in the background without drawing an actual GUI window to the OS desktop. `false` is incredibly useful for local debugging to physically watch the Agent click around.'
    },
    {
        path: 'browser.noSandbox',
        label: 'No Sandbox',
        type: 'boolean',
        description: 'Forces Chromium to boot with the `--no-sandbox` Linux flag. This severely degrades host OS security but is absolutely, strictly mandatory to operate Puppeteer properly inside a rooted Docker container.'
    },
    {
        path: 'browser.attachOnly',
        label: 'Attach Only',
        type: 'boolean',
        description: 'When utilizing `cdpUrl`, setting this to `true` ensures PowerDirector strictly attaches to pre-existing opened browser tabs rather than forcefully opening new ones on the remote host.'
    },
    {
        path: 'browser.defaultProfile',
        label: 'Default Profile',
        type: 'string',
        description: 'Maps the core Agent to a specific named user-data-dir cookie profile (e.g., `personal_bank` or `company_jira`), ensuring complex logins persist seamlessly across server restarts.'
    },
    {
        path: 'browser.snapshotDefaults',
        label: 'Snapshot Defaults',
        type: 'object',
        description: 'The geometric and algorithmic boundaries deciding exactly how the browser visually captures the webpage to feed back to the Agent\'s multimodal vision engine.'
    },
    {
        path: 'browser.snapshotDefaults.mode',
        label: 'Mode',
        type: 'string',
        description: 'Parsing strategy. Typically `dom` (extracts text), `visual` (takes physical JPEG screenshots), or `hybrid` (annotates JPEG screenshots with bounding boxes mapping back to the DOM nodes).'
    },
    {
        path: 'browser.profiles',
        label: 'Profiles',
        type: 'record',
        description: 'Dictionary maps assigning distinct `user-data-dir` physical filesystem paths to alphanumeric string keys. This allows different Agents mathematically separated logical sandboxes to login to the same website simultaneously with unique accounts.'
    }
];

export default function BrowserConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Browser Automation Pipeline Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep architecture bindings managing embedded headless Chromium/Playwright clusters. These settings govern how AI agents physically instantiate browsers, execute Javascript, and ingest visual screenshots for complex UI navigation.</p>
            </div>
            <div className="space-y-6">
                {BROWSER_CONFIGS.map((config) => (
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
