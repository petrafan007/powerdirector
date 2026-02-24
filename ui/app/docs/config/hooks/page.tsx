// AUTOMATICALLY GENERATED Documentation Component for hooks
import React from 'react';

const HOOKS_CONFIGS = [
    {
        path: 'hooks.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle authorizing the PowerDirector REST gateway to listen for unprompted incoming HTTP `POST` events from external systems (like GitHub, Stripe, or Jira). If `false`, the webhook router is completely unmounted.'
    },
    {
        path: 'hooks.path',
        label: 'Path',
        type: 'string',
        description: 'The explicitly defined frontend/backend proxy path (e.g. `/api/integrations/hooks`) where PowerDirector expects external systems to securely deliver their JSON payloads.'
    },
    {
        path: 'hooks.token',
        label: 'Token',
        type: 'string',
        description: 'A deeply sensitive cryptographic string used as a universal Bearer token or HMAC secret. External systems must provide this token in their HTTP Headers to prove authorization before PowerDirector will process the webhook.'
    },
    {
        path: 'hooks.defaultSessionKey',
        label: 'Default Session Key',
        type: 'string',
        description: 'A fallback routing identifier used when an incoming webhook lacks formatting. It defines which underlying Agent Memory thread the webhook payload should technically be appended to.'
    },
    {
        path: 'hooks.allowRequestSessionKey',
        label: 'Allow Request Session Key',
        type: 'boolean',
        description: 'If `true`, external clients can dynamically supply a `?sessionKey=UUID` query parameter in their webhook URL to forcefully inject the payload into a specific ongoing chat thread rather than a global generic thread.'
    },
    {
        path: 'hooks.allowedSessionKeyPrefixes',
        label: 'Allowed Session Key Prefixes',
        type: 'array',
        description: 'A security whitelist preventing external webhooks from arbitrarily spoofing sensitive admin chat threads. Restricts dynamically injected session keys to explicitly permitted prefixes (e.g. `jira-sync-`, `github-pr-`).'
    },
    {
        path: 'hooks.allowedAgentIds',
        label: 'Allowed Agent Ids',
        type: 'array',
        description: 'A whitelist bounding which specific Agents in the ecosystem can be forcibly woken up by an incoming webhook. Prevents external integrators from accidentally executing prompts against highly sensitive internal agent personas.'
    },
    {
        path: 'hooks.maxBodyBytes',
        label: 'Max Body Bytes',
        type: 'number',
        description: 'A strict memory cap (in bytes) dictating the largest JSON payload the webhook handler resolves. Crucial for mitigating DDoS attacks or violently large GitHub push payloads.'
    },
    {
        path: 'hooks.presets',
        label: 'Presets',
        type: 'record',
        description: 'Pre-bundled integration macros (e.g. `github`, `sentry`) offering out-of-the-box routing logic and secret verification handlers without requiring manual regex mapping.'
    },
    {
        path: 'hooks.transformsDir',
        label: 'Transforms Dir',
        type: 'string',
        description: 'Absolute system directory path pointing to custom JS/TS scripts used specifically to parse profoundly complex or proprietary webhook geometries before handing them cleanly to the LLM.'
    },
    {
        path: 'hooks.mappings',
        label: 'Mappings',
        type: 'array',
        description: 'The core complex routing matrix. Mappings dictate exactly which Agent wakes up, what channel they output to, and what system prompt is appended when a specific webhook matches a distinct URL pattern.'
    },
    {
        path: 'hooks.mappings[].id',
        label: 'Id',
        type: 'string',
        description: 'A unique string identifying this particular routing rule to allow administrative modification and logging traceability.'
    },
    {
        path: 'hooks.mappings[].match',
        label: 'Match',
        type: 'object',
        description: 'The conditional gate. Defines the exact Regex heuristics the incoming REST method and URL must fulfill to trigger this specific mapping rule.'
    },
    {
        path: 'hooks.mappings[].match.path',
        label: 'Path',
        type: 'string',
        description: 'The literal sub-route or regex evaluation evaluated against the HTTP Request URL (e.g. `^/github/push`).'
    },
    {
        path: 'hooks.mappings[].match.source',
        label: 'Source',
        type: 'string',
        description: 'An optional IP restriction or verified header parameter verifying the exact origin of the packet (e.g. validating Stripe\'s known IP block signatures).'
    },
    {
        path: 'hooks.mappings[].action',
        label: 'Action',
        type: 'Enum: process | ignore | drop',
        description: 'Determines the termination cycle. `process` continues down the chain to the LLM. `ignore` completes the HTTP handshake gracefully but does nothing. `drop` instantly kills the TCP socket.'
    },
    {
        path: 'hooks.mappings[].wakeMode',
        label: 'Wake Mode',
        type: 'Enum: async | sync | background',
        description: 'Governs connection state. `sync` holds the external server\'s HTTP connection open until the LLM finishes typing. `async` instantly returns HTTP 202 OK and runs the LLM prompt in a detached background thread.'
    },
    {
        path: 'hooks.mappings[].name',
        label: 'Name',
        type: 'string',
        description: 'A human-readable tag explicitly detailing the webhook\'s architectural purpose in logs (e.g. "GitHub PR Reviewer Hook").'
    },
    {
        path: 'hooks.mappings[].agentId',
        label: 'Agent Id',
        type: 'string',
        description: 'The target LLM profile designated to process the ingested webhook payload payload (e.g., waking up the `SecOpsAgent` when a Sentry webhook fires).'
    },
    {
        path: 'hooks.mappings[].sessionKey',
        label: 'Session Key',
        type: 'string',
        description: 'Explicit override locking this specific webhook route to a dedicated conversation history thread.'
    },
    {
        path: 'hooks.mappings[].messageTemplate',
        label: 'Message Template',
        type: 'string',
        description: 'A raw structured injection string (utilizing Handlebars or native interpolation) dynamically formatting the ugly incoming JSON into a clean prompt format for the LLM.'
    },
    {
        path: 'hooks.mappings[].textTemplate',
        label: 'Text Template',
        type: 'string',
        description: 'A secondary, vastly simplified parsing template specifically built for restrictive channels that cannot render complex Markdown data (like SMS or Signal).'
    },
    {
        path: 'hooks.mappings[].deliver',
        label: 'Deliver',
        type: 'boolean',
        description: 'If `true`, forces the webhook router to mandate an egress output. The Agent MUST generate text and send it to a mapped channel rather than just silently reading the webhook into memory.'
    },
    {
        path: 'hooks.mappings[].allowUnsafeExternalContent',
        label: 'Allow Unsafe External Content',
        type: 'boolean',
        description: 'Extremely dangerous boolean enabling the LLM to recursively follow standard `href` URLs implicitly found inside the Webhook JSON payload and execute Web Browser scraping against them.'
    },
    {
        path: 'hooks.mappings[].channel',
        label: 'Channel',
        type: 'string',
        description: 'The physical messaging protocol (e.g. `slack`, `discord`, `msteams`) designated to receive the LLM\'s final generated output.'
    },
    {
        path: 'hooks.mappings[].to',
        label: 'To',
        type: 'string',
        description: 'The specific Room UUID or target User Identifier on the defined `channel` where the finished payload is visually broadcast.'
    },
    {
        path: 'hooks.mappings[].model',
        label: 'Model',
        type: 'string',
        description: 'Permits overriding the target Agent\'s default LLM (e.g. swapping `gpt-4o` for `claude-3.5-sonnet`) solely for this specific webhook execution.'
    },
    {
        path: 'hooks.mappings[].thinking',
        label: 'Thinking',
        type: 'boolean',
        description: 'If `true`, instructs the LLM to utilize hidden chained-reasoning modules (like o3-mini\'s thought processes) to meticulously parse the webhook instead of instantly generating a reactive formatted message.'
    },
    {
        path: 'hooks.mappings[].timeoutSeconds',
        label: 'Timeout Seconds',
        type: 'number',
        description: 'Mathematical threshold forcibly terminating the webhook analysis job if the LLM exceeds this amount of processing time, preventing infinite loops.'
    },
    {
        path: 'hooks.mappings[].transform',
        label: 'Transform',
        type: 'object',
        description: 'Binds this specific routing mapping to a custom JavaScript parser file located inside the `transformsDir`.'
    },
    {
        path: 'hooks.mappings[].transform.module',
        label: 'Module',
        type: 'string',
        description: 'The EXACT filename (e.g. `github_formatter.js`) containing the Node.js translation code.'
    },
    {
        path: 'hooks.mappings[].transform.export',
        label: 'Export',
        type: 'string',
        description: 'The explicit exported function name inside the JS module (e.g. `parsePullRequest`) the system must call natively.'
    },
    {
        path: 'hooks.gmail',
        label: 'Gmail',
        type: 'object',
        description: 'A massive, specialized polling subsystem designed explicitly to bridge Google Pub/Sub architectures directly into PowerDirector for AI Email analysis.'
    },
    {
        path: 'hooks.gmail.account',
        label: 'Account',
        type: 'string',
        description: 'The Google Workspace or standard Gmail explicit email address (e.g. `support@company.com`) that the engine is authenticated against.'
    },
    {
        path: 'hooks.gmail.label',
        label: 'Label',
        type: 'string',
        description: 'Ties the listener strictly to a specific Gmail Inbox tag (e.g. `INBOX` or `URGENT`). Emails outside this label are entirely ignored by the polling loop.'
    },
    {
        path: 'hooks.gmail.topic',
        label: 'Topic',
        type: 'string',
        description: 'The Google Cloud Platform (GCP) Pub/Sub Topic ID the system utilizes to receive instant push alerts rather than relying on slow cron job fetching.'
    },
    {
        path: 'hooks.gmail.subscription',
        label: 'Subscription',
        type: 'string',
        description: 'The GCP Pub/Sub Subscription ID verifying the agent has authorized clearance to drain events off the Topic queue.'
    },
    {
        path: 'hooks.gmail.pushToken',
        label: 'Push Token',
        type: 'string',
        description: 'Internal Bearer secret utilized if GCP is configured to Push HTTP payloads heavily towards PowerDirector rather than utilizing long-polling Pull queues.'
    },
    {
        path: 'hooks.gmail.hookUrl',
        label: 'Hook Url',
        type: 'string',
        description: 'The specific external reverse-proxy endpoint or ngrok tunnel FQDN the Google servers hit when initiating their Push routine.'
    },
    {
        path: 'hooks.gmail.includeBody',
        label: 'Include Body',
        type: 'boolean',
        description: 'If `true`, downloads the massive multipart/mixed MIME chunks. Required if the agent needs to read the email, but highly memory intensive.'
    },
    {
        path: 'hooks.gmail.maxBytes',
        label: 'Max Bytes',
        type: 'number',
        description: 'Failsafe threshold automatically truncating incoming emails with immense raw graphical footprints or massive encoded attachments.'
    },
    {
        path: 'hooks.gmail.renewEveryMinutes',
        label: 'Renew Every Minutes',
        type: 'number',
        description: 'Cron timer detailing exactly how often the system must ping Google APIs to refresh short-lived OAuth2 security access tokens.'
    },
    {
        path: 'hooks.gmail.allowUnsafeExternalContent',
        label: 'Allow Unsafe External Content',
        type: 'boolean',
        description: 'Extremely dangerous boolean permitting the agent to scrape external links embedded implicitly within the HTML email payload natively inside the Sandbox.'
    },
    {
        path: 'hooks.gmail.serve',
        label: 'Serve',
        type: 'object',
        description: 'Specific bindings for the segregated secondary HTTP server purely isolated to receive Google Pub/Sub traffic without exposing the primary GUI.'
    },
    {
        path: 'hooks.gmail.serve.bind',
        label: 'Bind',
        type: 'string',
        description: 'The Unix NIC interface mapping (ordinarily `0.0.0.0` or `127.0.0.1`) where the listener lives.'
    },
    {
        path: 'hooks.gmail.serve.port',
        label: 'Port',
        type: 'number',
        description: 'The isolated TCP socket port for the Google traffic.'
    },
    {
        path: 'hooks.gmail.serve.path',
        label: 'Path',
        type: 'string',
        description: 'The absolute URL sub-route Google expects a 200 OK from.'
    },
    {
        path: 'hooks.gmail.tailscale',
        label: 'Tailscale',
        type: 'object',
        description: 'Configuration managing zero-trust overlay networks ensuring the internal Webhook router operates securely without standard port-forwarding across public ingress firewalls.'
    },
    {
        path: 'hooks.gmail.tailscale.mode',
        label: 'Mode',
        type: 'string',
        description: 'Defines the proxy translation type: typically `funnel` passing raw public traffic into a protected internal subnet.'
    },
    {
        path: 'hooks.gmail.tailscale.path',
        label: 'Path',
        type: 'string',
        description: 'The relative socket path or socket proxy location managed by the Tailscale daemon.'
    },
    {
        path: 'hooks.gmail.tailscale.target',
        label: 'Target',
        type: 'string',
        description: 'The explicit internal host loopback address the Tailscale node translates external incoming traffic towards.'
    },
    {
        path: 'hooks.gmail.model',
        label: 'Model',
        type: 'string',
        description: 'LLM override strictly utilized for parsing the Gmail ingestion loop.'
    },
    {
        path: 'hooks.gmail.thinking',
        label: 'Thinking',
        type: 'boolean',
        description: 'Forces deep-analysis inference parameters on email parsing tasks instead of standard generation.'
    },
    {
        path: 'hooks.internal',
        label: 'Internal',
        type: 'object',
        description: 'A native subsystem entirely bypassing external HTTP layers. Internal Hooks are Node.js `EventEmitter` listeners reacting synchronously to global state changes within the codebase.'
    },
    {
        path: 'hooks.internal.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the background NodeJS Event loop subscriber. If disabled, Agents cannot react arbitrarily to system states (like "Database Synced").'
    },
    {
        path: 'hooks.internal.handlers',
        label: 'Handlers',
        type: 'array',
        description: 'Hardcoded matrix linking custom JavaScript files explicitly to system notification signals.'
    },
    {
        path: 'hooks.internal.handlers[].event',
        label: 'Event',
        type: 'string',
        description: 'The exact string identifier of the event emitter trigger (e.g. `agent.boot`, `sandbox.crash`, `db.migration_complete`).'
    },
    {
        path: 'hooks.internal.handlers[].module',
        label: 'Module',
        type: 'string',
        description: 'The absolute or relative path to the `.js` or `.ts` script housing the logic intended to react to the system event.'
    },
    {
        path: 'hooks.internal.handlers[].export',
        label: 'Export',
        type: 'string',
        description: 'The specific function signature inside the module to be called dynamically by the engine when the event pops.'
    },
    {
        path: 'hooks.internal.entries',
        label: 'Entries',
        type: 'array',
        description: 'Additional legacy or specialized internal trigger definitions injected into the primary `handlers` pool during execution.'
    },
    {
        path: 'hooks.internal.load',
        label: 'Load',
        type: 'object',
        description: 'Security and file-handling boundaries determining where PowerDirector is permitted to dynamically `require()` code.'
    },
    {
        path: 'hooks.internal.load.extraDirs',
        label: 'Extra Dirs',
        type: 'array',
        description: 'Whitelist of absolute Linux directories (e.g., `/opt/powerdirector_plugins/`) the system is inherently allowed to scan for Javascript event handlers.'
    },
    {
        path: 'hooks.internal.installs',
        label: 'Installs',
        type: 'array',
        description: 'List array defining auto-run procedures mapping specifically designated Hook packages upon system init sequences.'
    }
];

export default function HooksConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Webhooks & Triggers Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep architecture definitions strictly governing how external REST traffic (via JSON Webhooks) and internal Publisher/Subscriber signals actively hijack AI agents to forcefully execute workflow pipelines.</p>
            </div>
            <div className="space-y-6">
                {HOOKS_CONFIGS.map((config) => (
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
