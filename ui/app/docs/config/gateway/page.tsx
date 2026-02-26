// AUTOMATICALLY GENERATED Documentation Component for gateway
import React from 'react';

const GATEWAY_CONFIGS = [
    {
        path: 'gateway.port',
        label: 'Port',
        type: 'number',
        description: 'The primary physical TCP socket port (default `8080`) where the PowerDirector Node.js Express server binds to listen for HTTP REST and WebSocket traffic.'
    },
    {
        path: 'gateway.mode',
        label: 'Mode',
        type: 'Enum: local | tailscale | mesh',
        description: 'Architectural topology setting. `local` binds purely to standard NICs. `tailscale` dynamically provisions a zero-configuration WireGuard tunnel to seamlessly punch through NAT firewalls without exposing public ports.'
    },
    {
        path: 'gateway.channelHealthCheckMinutes',
        label: 'Channel Health Check Minutes',
        type: 'number',
        description: 'Interval dictating how frequently the Gateway pings active connections (like Slack WebSockets or Discord Shards) to ensure TCP keep-alives and reconnect silently if the socket dropped out.'
    },
    {
        path: 'gateway.bind',
        label: 'Bind',
        type: 'string',
        description: 'The specific Network Interface IP (e.g. `0.0.0.0` for all interfaces, or `127.0.0.1` for strictly loopback) the HTTP server listens on.'
    },
    {
        path: 'gateway.controlUi',
        label: 'Control Ui',
        type: 'object',
        description: 'Configuration for the embedded Next.js or React dashboard shipped inside PowerDirector to manage Agents visually.'
    },
    {
        path: 'gateway.controlUi.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles whether the Gateway serves standard HTML/JS web assets, or strictly operates as a massive headless JSON API.'
    },
    {
        path: 'gateway.controlUi.basePath',
        label: 'Base Path',
        type: 'string',
        description: 'Sub-routing prefix (e.g. `/admin`) allowing PowerDirector to sit behind a reverse proxy like Nginx alongside other web applications.'
    },
    {
        path: 'gateway.controlUi.root',
        label: 'Root',
        type: 'string',
        description: 'The absolute file path on the host Linux OS pointing to the compiled static UI assets directory.'
    },
    {
        path: 'gateway.controlUi.allowedOrigins',
        label: 'Allowed Origins',
        type: 'array',
        description: 'CORS whitelist (Cross-Origin Resource Sharing) dictating which external domains (e.g. `https://my-dashboard.com`) your browser is allowed to connect to the PowerDirector REST API from.'
    },
    {
        path: 'gateway.controlUi.allowInsecureAuth',
        label: 'Allow Insecure Auth',
        type: 'boolean',
        description: 'Highly dangerous. If `true`, allows Web UI JWT login tokens to transit over plain HTTP instead of forcing strict HTTPS/TLS, typically used only for local Docker testing.'
    },
    {
        path: 'gateway.controlUi.dangerouslyDisableDeviceAuth',
        label: 'Dangerously Disable Device Auth',
        type: 'boolean',
        description: 'Permanently skips the requirement to "Approve" new web browsers trying to connect to the Admin UI, relying solely on passwords.'
    },
    {
        path: 'gateway.auth',
        label: 'Auth',
        type: 'object',
        description: 'Global HTTP security verification rules.'
    },
    {
        path: 'gateway.auth.mode',
        label: 'Mode',
        type: 'Enum: token | proxy | mesh | none',
        description: 'Determines how inbound HTTP hits prove who they are. `token` enforces standard Bearer JWTs. `proxy` relies entirely on secondary ingress providers like Cloudflare Access to handle validation.'
    },
    {
        path: 'gateway.auth.token',
        label: 'Token',
        type: 'string',
        description: 'A static, unbreakable master API key required in the `Authorization: Bearer <token>` header for headless scripts to bypass the JWT dance.'
    },
    {
        path: 'gateway.auth.password',
        label: 'Password',
        type: 'string',
        description: 'The human-readable password users type into the Web GUI to generate a temporary Session JWT.'
    },
    {
        path: 'gateway.auth.allowTailscale',
        label: 'Allow Tailscale',
        type: 'boolean',
        description: 'If `true`, entirely disables password checks for any HTTP packets proven to originate from within your authenticated private Tailscale WireGuard mesh.'
    },
    {
        path: 'gateway.auth.rateLimit',
        label: 'Rate Limit',
        type: 'object',
        description: 'Defensive configuration mitigating dictionary attacks against the `/login` routes.'
    },
    {
        path: 'gateway.auth.rateLimit.maxAttempts',
        label: 'Max Attempts',
        type: 'number',
        description: 'How many failed login attempts an IP address gets before being banned.'
    },
    {
        path: 'gateway.auth.rateLimit.windowMs',
        label: 'Window Ms',
        type: 'number',
        description: 'The rolling time window (in milliseconds) analyzing `maxAttempts`.'
    },
    {
        path: 'gateway.auth.rateLimit.lockoutMs',
        label: 'Lockout Ms',
        type: 'number',
        description: 'How severely to punish a brute-forcing IP address by dropping their TCP packets completely for this duration.'
    },
    {
        path: 'gateway.auth.rateLimit.exemptLoopback',
        label: 'Exempt Loopback',
        type: 'boolean',
        description: 'If `true`, Docker sidecars or local `127.0.0.1` scripts will never be rate-limited out of the system during aggressive automated testing.'
    },
    {
        path: 'gateway.auth.trustedProxy',
        label: 'Trusted Proxy',
        type: 'object',
        description: 'Crucial for Enterprise setups relying on Cloudflare Access, Pomerium, or Teleport. It instructs the Node server to blindly trust custom HTTP Headers asserting user identity.'
    },
    {
        path: 'gateway.auth.trustedProxy.userHeader',
        label: 'User Header',
        type: 'string',
        description: 'The exact HTTP Header literally containing the pre-authenticated user email (e.g. `X-Forwarded-User` or `Cf-Access-Authenticated-User-Email`).'
    },
    {
        path: 'gateway.auth.trustedProxy.requiredHeaders',
        label: 'Required Headers',
        type: 'record',
        description: 'Additional cryptographic headers (like HMAC signatures) that MUST be present to mathematically prove the proxy hasn\'t been spoofed.'
    },
    {
        path: 'gateway.auth.trustedProxy.allowUsers',
        label: 'Allow Users',
        type: 'array',
        description: 'Whitelist matrix. Even if Cloudflare Access says "Bob is Valid", if Bob\'s email isn\'t in this list, PowerDirector rejects the request.'
    },
    {
        path: 'gateway.trustedProxies',
        label: 'Trusted Proxies',
        type: 'array',
        description: 'Provides Node.js underlying Express engine with IPv4/CIDR masks mapping to allowed reverse proxies so `req.ip` correctly resolves the external client instead of Nginx.'
    },
    {
        path: 'gateway.tools',
        label: 'Tools',
        type: 'object',
        description: 'Global fallback bounds dictating Tool schema capabilities across the entire gateway API.'
    },
    {
        path: 'gateway.tools.deny',
        label: 'Deny',
        type: 'array',
        description: 'List of string tool names (e.g. `fs.write`) permanently disabled from all REST requests crossing this gateway.'
    },
    {
        path: 'gateway.tools.allow',
        label: 'Allow',
        type: 'array',
        description: 'Explicit whitelist strictly defining the ONLY subset of tools permitted across the REST API.'
    },
    {
        path: 'gateway.tailscale',
        label: 'Tailscale',
        type: 'object',
        description: 'Native Tsnet embedding. PowerDirector physically boots a userspace WireGuard mesh node directly inside Node.js, requiring zero host OS-level installation.'
    },
    {
        path: 'gateway.tailscale.mode',
        label: 'Mode',
        type: 'string',
        description: 'Typically `ephemeral` (node securely self-destructs upon shutdown) or `persistent` (node claims a static IP in the mesh forever).'
    },
    {
        path: 'gateway.tailscale.resetOnExit',
        label: 'Reset On Exit',
        type: 'boolean',
        description: 'Forces clean deletion of cryptographic keys when the Node process ends.'
    },
    {
        path: 'gateway.remote',
        label: 'Remote',
        type: 'object',
        description: 'For distributed environments. Defines how a "Worker" PowerDirector node phones back home to a "Master" PowerDirector node.'
    },
    {
        path: 'gateway.remote.url',
        label: 'Url',
        type: 'string',
        description: 'FQDN of the Master controlling node.'
    },
    {
        path: 'gateway.remote.transport',
        label: 'Transport',
        type: 'Enum: wss | https | ts',
        description: 'Network traversal standard (WebSockets, HTTP Long-Polling, or direct Tailscale mesh).'
    },
    {
        path: 'gateway.remote.token',
        label: 'Token',
        type: 'string',
        description: 'Authentication secret establishing Worker to Master trust.'
    },
    {
        path: 'gateway.remote.password',
        label: 'Password',
        type: 'string',
        description: 'Secondary encryption overlay.'
    },
    {
        path: 'gateway.remote.tlsFingerprint',
        label: 'Tls Fingerprint',
        type: 'string',
        description: 'Mathematical SHA-256 hash strictly pinning the Master\'s SSL certificate to thwart aggressive Man-in-the-Middle hijacking.'
    },
    {
        path: 'gateway.remote.sshTarget',
        label: 'Ssh Target',
        type: 'string',
        description: 'Fallback transport utilizing native SSH tunneling instead of HTTP.'
    },
    {
        path: 'gateway.remote.sshIdentity',
        label: 'Ssh Identity',
        type: 'string',
        description: 'RSA/Ed25519 private key mapping.'
    },
    {
        path: 'gateway.reload',
        label: 'Reload',
        type: 'object',
        description: 'Handles live configuration file changes.'
    },
    {
        path: 'gateway.reload.mode',
        label: 'Mode',
        type: 'Enum: auto | manual',
        description: 'If `auto`, the server natively watches `powerdirector.yaml` on disk and hot-restarts routes without dropping ongoing connections.'
    },
    {
        path: 'gateway.reload.debounceMs',
        label: 'Debounce Ms',
        type: 'number',
        description: 'Limits restart firing loops if vim writes 10 swap-file changes rapidly.'
    },
    {
        path: 'gateway.tls',
        label: 'Tls',
        type: 'object',
        description: 'Native SSL termination. Can remove the need for Nginx by hosting HTTPS directly within Node.js.'
    },
    {
        path: 'gateway.tls.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Activates HTTPS socket listeners instead of cleartext HTTP.'
    },
    {
        path: 'gateway.tls.autoGenerate',
        label: 'Auto Generate',
        type: 'boolean',
        description: 'If valid certificates are missing, forces the system to mathematically generate self-signed `.pem` files on boot to ensure encryption exists.'
    },
    {
        path: 'gateway.tls.certPath',
        label: 'Cert Path',
        type: 'string',
        description: 'Absolute path to the signed Public Key (`.crt` / `.pem`).'
    },
    {
        path: 'gateway.tls.keyPath',
        label: 'Key Path',
        type: 'string',
        description: 'Absolute path to the intensely secret Private Key (`.key`).'
    },
    {
        path: 'gateway.tls.caPath',
        label: 'Ca Path',
        type: 'string',
        description: 'Absolute path to intermediate chaining bundles.'
    },
    {
        path: 'gateway.http',
        label: 'Http',
        type: 'object',
        description: 'Deep overrides for internal Express REST execution parameters.'
    },
    {
        path: 'gateway.http.endpoints',
        label: 'Endpoints',
        type: 'object',
        description: 'Configuring specific REST URI listeners like the OpenAI-compatible endpoints.'
    },
    {
        path: 'gateway.http.endpoints.chatCompletions',
        label: 'Chat Completions',
        type: 'object',
        description: 'Routes mirroring `/v1/chat/completions` tricking other apps into using PowerDirector as an OpenAI provider.'
    },
    {
        path: 'gateway.http.endpoints.chatCompletions.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the OpenAI compatible API facade.'
    },
    {
        path: 'gateway.http.endpoints.responses',
        label: 'Responses',
        type: 'object',
        description: 'Security rules for `v1/responses` endpoints specifically governing how PowerDirector proxies and fetches third-party payloads explicitly requested by incoming API triggers.'
    },
    {
        path: 'gateway.http.endpoints.responses.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles complex response parsing endpoints.'
    },
    {
        path: 'gateway.http.endpoints.responses.maxBodyBytes',
        label: 'Max Body Bytes',
        type: 'number',
        description: 'Prevents colossal API payloads from crashing the Node V8 heap.'
    },
    {
        path: 'gateway.http.endpoints.responses.maxUrlParts',
        label: 'Max Url Parts',
        type: 'number',
        description: 'Heuristic mitigating traversal attacks.'
    },
    {
        path: 'gateway.http.endpoints.responses.files',
        label: 'Files',
        type: 'object',
        description: 'Rules governing how the proxy fetches external raw PDF/Doc files explicitly requested.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.allowUrl',
        label: 'Allow Url',
        type: 'boolean',
        description: 'Can the proxy dynamically download files from URLs passed in the REST body?'
    },
    {
        path: 'gateway.http.endpoints.responses.files.urlAllowlist',
        label: 'Url Allowlist',
        type: 'array',
        description: 'Whitelist string boundaries for external downloading.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.allowedMimes',
        label: 'Allowed Mimes',
        type: 'array',
        description: 'Prevents the proxy from downloading arbitrary `.exe` binaries instead of expected `.pdf` files.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.maxBytes',
        label: 'Max Bytes',
        type: 'number',
        description: 'Size limit threshold for downloaded files.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.maxChars',
        label: 'Max Chars',
        type: 'number',
        description: 'Limits the amount of extracted text the system pulls from the PDF/File into the LLM context.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.maxRedirects',
        label: 'Max Redirects',
        type: 'number',
        description: 'Protection against malicious HTTP routing traps.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.timeoutMs',
        label: 'Timeout Ms',
        type: 'number',
        description: 'Forces aggressive death if the file server is hanging.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.pdf',
        label: 'Pdf',
        type: 'object',
        description: 'Specific parameter bounds exclusively for `pdf.js` memory limits.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.pdf.maxPages',
        label: 'Max Pages',
        type: 'number',
        description: 'Prevents reading 10,000 page legal discovery PDFs and exhausting RAM.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.pdf.maxPixels',
        label: 'Max Pixels',
        type: 'number',
        description: 'Image rendering ceiling if OCR is triggered against native PDFs.'
    },
    {
        path: 'gateway.http.endpoints.responses.files.pdf.minTextChars',
        label: 'Min Text Chars',
        type: 'number',
        description: 'Failsafe heuristically figuring out if a PDF requires visual OCR because standard text extraction yielded too little data.'
    },
    {
        path: 'gateway.http.endpoints.responses.images',
        label: 'Images',
        type: 'object',
        description: 'Analogous downloading protection matrices expressly for images requested by APIs.'
    },
    {
        path: 'gateway.http.endpoints.responses.images.allowUrl',
        label: 'Allow Url',
        type: 'boolean',
        description: 'Permit remote URL fetching?'
    },
    {
        path: 'gateway.http.endpoints.responses.images.urlAllowlist',
        label: 'Url Allowlist',
        type: 'array',
        description: 'Regex/String whitelist restricting target servers.'
    },
    {
        path: 'gateway.http.endpoints.responses.images.allowedMimes',
        label: 'Allowed Mimes',
        type: 'array',
        description: 'Forces downloaded payload to match genuine Visual MIME headers.'
    },
    {
        path: 'gateway.http.endpoints.responses.images.maxBytes',
        label: 'Max Bytes',
        type: 'number',
        description: 'Memory safeguard.'
    },
    {
        path: 'gateway.http.endpoints.responses.images.maxRedirects',
        label: 'Max Redirects',
        type: 'number',
        description: 'Safety ceiling.'
    },
    {
        path: 'gateway.http.endpoints.responses.images.timeoutMs',
        label: 'Timeout Ms',
        type: 'number',
        description: 'Termination boundary limit.'
    },
    {
        path: 'gateway.nodes',
        label: 'Nodes',
        type: 'object',
        description: 'Remote clustered architecture parameters governing headless browser scraping execution routing across separate server zones.'
    },
    {
        path: 'gateway.nodes.browser',
        label: 'Browser',
        type: 'object',
        description: 'Configuration determining where Puppeteer/Playwright instances actually spool up.'
    },
    {
        path: 'gateway.nodes.browser.mode',
        label: 'Mode',
        type: 'Enum: local | remote',
        description: '`local` boots Chrome on this specific machine. `remote` routes the execution command to a vastly cheaper secondary server exclusively handling browser RAM limits.'
    },
    {
        path: 'gateway.nodes.browser.node',
        label: 'Node',
        type: 'string',
        description: 'The endpoint URL pointing to the secondary clustered Host operating the Browsers.'
    },
    {
        path: 'gateway.nodes.allowCommands',
        label: 'Allow Commands',
        type: 'array',
        description: 'Cluster strict boundaries stating which exact tasks an external remote Worker node is legally allowed to request the Master node to perform.'
    },
    {
        path: 'gateway.nodes.denyCommands',
        label: 'Deny Commands',
        type: 'array',
        description: 'Absolute blacklist blocking specified remote procedures.'
    }
];

export default function GatewayConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">HTTP/WS Gateway Server Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep architecture bindings managing the underlying Express.js instance. Controls TCP ports, Tailscale VPN meshes, HTTP Endpoints, remote node clustering, and Web UI security authentication matrices.</p>
            </div>
            <div className="space-y-6">
                {GATEWAY_CONFIGS.map((config) => (
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
