export const FIELD_LABELS: Record<string, string> = {
    "plugins.enabled": "Enable Plugins",
    "plugins.allow": "Plugin Allowlist",
    "plugins.deny": "Plugin Denylist",
    "plugins.load.paths": "Plugin Load Paths",
    "plugins.load": "Load", // Derived from "load" key
    "plugins.slots": "Plugin Slots",
    "plugins.slots.memory": "Memory Plugin",
    "plugins.entries": "Plugin Entries",
    "plugins.entries.*.enabled": "Plugin Enabled",
    "plugins.entries.*.config": "Plugin Config",

    // Plugin Labels
    "plugins.entries.bluebubbles": "@powerdirector/bluebubbles",
    "plugins.entries.copilot-proxy": "@powerdirector/copilot-proxy",
    "plugins.entries.diagnostics-otel": "@powerdirector/diagnostics-otel",
    "plugins.entries.feishu": "@powerdirector/feishu",
    "plugins.entries.google-antigravity-auth": "@powerdirector/google-antigravity-auth",
    "plugins.entries.google-gemini-cli-auth": "@powerdirector/google-gemini-cli-auth",
    "plugins.entries.googlechat": "@powerdirector/googlechat",
    "plugins.entries.imessage": "@powerdirector/imessage",
    "plugins.entries.irc": "@powerdirector/irc",
    "plugins.entries.line": "@powerdirector/line",
    "plugins.entries.llm-task": "LLM Task",
    "plugins.entries.matrix": "@powerdirector/matrix",
    "plugins.entries.mattermost": "@powerdirector/mattermost",
    "plugins.entries.memory-core": "Memory (Core)",
    "plugins.entries.memory-lancedb": "@powerdirector/memory-lancedb",
    "plugins.entries.minimax-portal-auth": "@powerdirector/minimax-portal-auth",
    "plugins.entries.msteams": "@powerdirector/msteams",
    "plugins.entries.nextcloud-talk": "@powerdirector/nextcloud-talk",
    "plugins.entries.nostr": "@powerdirector/nostr",
    "plugins.entries.open-prose": "OpenProse",
    "plugins.entries.phone-control": "Phone Control",
    "plugins.entries.qwen-portal-auth": "qwen-portal-auth",
    "plugins.entries.signal": "@powerdirector/signal",
    "plugins.entries.talk-voice": "Talk Voice",
    "plugins.entries.telegram": "Telegram",
    "plugins.entries.thread-ownership": "Thread Ownership",
    "plugins.entries.tlon": "@powerdirector/tlon",
    "plugins.entries.twitch": "@powerdirector/twitch",
    "plugins.entries.voice-call": "@powerdirector/voice-call",
    "plugins.entries.whatsapp": "@powerdirector/whatsapp",
    "plugins.entries.zalo": "@powerdirector/zalo",
    "plugins.entries.zalouser": "@powerdirector/zalouser",
    "plugins.entries.discord": "Discord",
    "plugins.entries.lobster": "Lobster",
    "plugins.entries.device-pair": "Device Pairing",

    // Voice Call Plugin Hints
    "plugins.entries.voice-call.config.provider": "Provider",
    "plugins.entries.voice-call.config.fromNumber": "From Number",
    "plugins.entries.voice-call.config.toNumber": "Default To Number",
    "plugins.entries.voice-call.config.inboundPolicy": "Inbound Policy",
    "plugins.entries.voice-call.config.allowFrom": "Inbound Allowlist",
    "plugins.entries.voice-call.config.inboundGreeting": "Inbound Greeting",
    "plugins.entries.voice-call.config.telnyx.apiKey": "Telnyx API Key",
    "plugins.entries.voice-call.config.telnyx.connectionId": "Telnyx Connection ID",
    "plugins.entries.voice-call.config.telnyx.publicKey": "Telnyx Public Key",
    "plugins.entries.voice-call.config.twilio.accountSid": "Twilio Account SID",
    "plugins.entries.voice-call.config.twilio.authToken": "Twilio Auth Token",
    "plugins.entries.voice-call.config.outbound.defaultMode": "Default Call Mode",
    "plugins.entries.voice-call.config.outbound.notifyHangupDelaySec": "Notify Hangup Delay (sec)",
    "plugins.entries.voice-call.config.serve.port": "Webhook Port",
    "plugins.entries.voice-call.config.serve.bind": "Webhook Bind",
    "plugins.entries.voice-call.config.serve.path": "Webhook Path",
    "plugins.entries.voice-call.config.tailscale.mode": "Tailscale Mode",
    "plugins.entries.voice-call.config.tailscale.path": "Tailscale Path",
    "plugins.entries.voice-call.config.tunnel.provider": "Tunnel Provider",
    "plugins.entries.voice-call.config.tunnel.ngrokAuthToken": "ngrok Auth Token",
    "plugins.entries.voice-call.config.tunnel.ngrokDomain": "ngrok Domain",
    "plugins.entries.voice-call.config.tunnel.allowNgrokFreeTierLoopbackBypass": "Allow ngrok Free Tier (Loopback Bypass)",
    "plugins.entries.voice-call.config.streaming.enabled": "Enable Streaming",
    "plugins.entries.voice-call.config.streaming.openaiApiKey": "OpenAI Realtime API Key",
    "plugins.entries.voice-call.config.streaming.sttModel": "Realtime STT Model",
    "plugins.entries.voice-call.config.streaming.streamPath": "Media Stream Path",
    "plugins.entries.voice-call.config.tts.provider": "TTS Provider Override",
    "plugins.entries.voice-call.config.tts.openai.model": "OpenAI TTS Model",
    "plugins.entries.voice-call.config.tts.openai.voice": "OpenAI TTS Voice",
    "plugins.entries.voice-call.config.tts.openai.apiKey": "OpenAI API Key",
    "plugins.entries.voice-call.config.tts.elevenlabs.modelId": "ElevenLabs Model ID",
    "plugins.entries.voice-call.config.tts.elevenlabs.voiceId": "ElevenLabs Voice ID",
    "plugins.entries.voice-call.config.tts.elevenlabs.apiKey": "ElevenLabs API Key",
    "plugins.entries.voice-call.config.tts.elevenlabs.baseUrl": "ElevenLabs Base URL",
    "plugins.entries.voice-call.config.publicUrl": "Public Webhook URL",
    "plugins.entries.voice-call.config.skipSignatureVerification": "Skip Signature Verification",
    "plugins.entries.voice-call.config.store": "Call Log Store Path",
    "plugins.entries.voice-call.config.responseModel": "Response Model",
    "plugins.entries.voice-call.config.responseSystemPrompt": "Response System Prompt",
    "plugins.entries.voice-call.config.responseTimeoutMs": "Response Timeout (ms)",

    // Memory LanceDB Plugin Hints
    "plugins.entries.memory-lancedb.config.embedding.apiKey": "OpenAI API Key",
    "plugins.entries.memory-lancedb.config.embedding.model": "Embedding Model",
    "plugins.entries.memory-lancedb.config.dbPath": "Database Path",
    "plugins.entries.memory-lancedb.config.autoCapture": "Auto-Capture",
    "plugins.entries.memory-lancedb.config.autoRecall": "Auto-Recall",
    "plugins.entries.memory-lancedb.config.captureMaxChars": "Capture Max Chars",

    // LLM Task Plugin Hints
    "plugins.entries.llm-task.config.defaultProvider": "Default Provider",
    "plugins.entries.llm-task.config.defaultModel": "Default Model",
    "plugins.entries.llm-task.config.defaultAuthProfileId": "Default Auth Profile ID",
    "plugins.entries.llm-task.config.allowedModels": "Allowed Models",
    "plugins.entries.llm-task.config.maxTokens": "Max Tokens",
    "plugins.entries.llm-task.config.timeoutMs": "Timeout (ms)",

    // Thread Ownership Plugin Hints
    "plugins.entries.thread-ownership.config.forwarderUrl": "Forwarder URL",
    "plugins.entries.thread-ownership.config.abTestChannels": "A/B Test Channels",

    // Device Pairing Plugin Hints
    "plugins.entries.device-pair.config.publicUrl": "Gateway URL",
    "plugins.installs": "Plugin Install Records",
    "plugins.installs.*.source": "Plugin Install Source",
    "plugins.installs.*.spec": "Plugin Install Spec",
    "plugins.installs.*.sourcePath": "Plugin Install Source Path",
    "plugins.installs.*.installPath": "Plugin Install Path",
    "plugins.installs.*.version": "Plugin Install Version",
    "plugins.installs.*.installedAt": "Plugin Install Time",
    // Add other common ones for context
    "gateway.remote.url": "Remote Gateway URL",
    "gateway.auth.token": "Gateway Token",
    "agents.list.*.identity.avatar": "Identity Avatar",
    "commands.ownerAllowFrom": "Command Owners",
    // Memory & QMD
    "memory": "Memory",
    "memory.backend": "Memory Backend",
    "memory.citations": "Memory Citations Mode",
    "memory.qmd.command": "QMD Binary",
    "memory.qmd.includeDefaultMemory": "QMD Include Default Memory",
    "memory.qmd.paths": "QMD Extra Paths",
    "memory.qmd.paths.path": "QMD Path",
    "memory.qmd.paths.pattern": "QMD Path Pattern",
    "memory.qmd.paths.name": "QMD Path Name",
    "memory.qmd.sessions.enabled": "QMD Session Indexing",
    "memory.qmd.sessions.exportDir": "QMD Session Export Directory",
    "memory.qmd.sessions.retentionDays": "QMD Session Retention (days)",
    "memory.qmd.update.interval": "QMD Update Interval",
    "memory.qmd.update.debounceMs": "QMD Update Debounce (ms)",
    "memory.qmd.update.onBoot": "QMD Update on Startup",
    "memory.qmd.update.waitForBootSync": "QMD Wait for Boot Sync",
    "memory.qmd.update.embedInterval": "QMD Embed Interval",
    "memory.qmd.update.commandTimeoutMs": "QMD Command Timeout (ms)",
    "memory.qmd.update.updateTimeoutMs": "QMD Update Timeout (ms)",
    "memory.qmd.update.embedTimeoutMs": "QMD Embed Timeout (ms)",
    "memory.qmd.limits.maxResults": "QMD Max Results",
    "memory.qmd.limits.maxSnippetChars": "QMD Max Snippet Chars",
    "memory.qmd.limits.maxInjectedChars": "QMD Max Injected Chars",
    "memory.qmd.limits.timeoutMs": "QMD Search Timeout (ms)",
    "memory.qmd.scope": "QMD Surface Scope",
};

export const FIELD_HELP: Record<string, string> = {
    "plugins.enabled": "Enable plugin/extension loading (default: true).",
    "plugins.allow": "Optional allowlist of plugin ids; when set, only listed plugins load.",
    "plugins.deny": "Optional denylist of plugin ids; deny wins over allowlist.",
    "plugins.load.paths": "Additional plugin files or directories to load.",
    "plugins.slots": "Select which plugins own exclusive slots (memory, etc.).",
    "plugins.slots.memory": 'Select the active memory plugin by id, or "none" to disable memory plugins.',
    "plugins.entries": "Per-plugin settings keyed by plugin id (enable/disable + config payloads).",
    "plugins.entries.*.enabled": "Overrides plugin enable/disable for this entry (restart required).",
    "plugins.entries.*.config": "Plugin-defined config payload (schema is provided by the plugin).",

    // Plugin Descriptions
    "plugins.entries.bluebubbles": "PowerDirector BlueBubbles channel plugin (plugin: bluebubbles)",
    "plugins.entries.copilot-proxy": "PowerDirector GitHub Copilot proxy plugin (plugin: copilot-proxy)",
    "plugins.entries.diagnostics-otel": "PowerDirector diagnostics OpenTelemetry exporter (plugin: diagnostics-otel)",
    "plugins.entries.feishu": "PowerDirector Feishu/Lark channel plugin (plugin: feishu)",
    "plugins.entries.google-antigravity-auth": "PowerDirector Google Antigravity Auth provider plugin (plugin: google-antigravity-auth)",
    "plugins.entries.google-gemini-cli-auth": "PowerDirector Google Gemini CLI OAuth provider plugin (plugin: google-gemini-cli-auth)",
    "plugins.entries.googlechat": "PowerDirector Google Chat channel plugin (plugin: googlechat)",
    "plugins.entries.imessage": "PowerDirector iMessage channel plugin (plugin: imessage)",
    "plugins.entries.irc": "PowerDirector IRC channel plugin (plugin: irc)",
    "plugins.entries.line": "PowerDirector LINE channel plugin (plugin: line)",
    "plugins.entries.llm-task": "PowerDirector JSON-only LLM task plugin (plugin: llm-task)",
    "plugins.entries.matrix": "PowerDirector Matrix channel plugin (plugin: matrix)",
    "plugins.entries.mattermost": "PowerDirector Mattermost channel plugin (plugin: mattermost)",
    "plugins.entries.memory-core": "PowerDirector core memory search plugin (plugin: memory-core)",
    "plugins.entries.memory-lancedb": "PowerDirector LanceDB-backed long-term memory plugin with auto-recall/capture (plugin: memory-lancedb)",
    "plugins.entries.minimax-portal-auth": "PowerDirector MiniMax Portal OAuth provider plugin (plugin: minimax-portal-auth)",
    "plugins.entries.msteams": "PowerDirector MS Teams channel plugin (plugin: msteams)",
    "plugins.entries.nextcloud-talk": "PowerDirector Nextcloud Talk channel plugin (plugin: nextcloud-talk)",
    "plugins.entries.nostr": "PowerDirector Nostr channel plugin (plugin: nostr)",
    "plugins.entries.open-prose": "OpenProse VM skill pack with a /prose slash command. (plugin: open-prose)",
    "plugins.entries.phone-control": "Arm/disarm high-risk phone node commands (camera/screen/writes) with an optional auto-expiry. (plugin: phone-control)",
    "plugins.entries.qwen-portal-auth": "PowerDirector Qwen Portal OAuth provider plugin (plugin: qwen-portal-auth)",
    "plugins.entries.signal": "PowerDirector Signal channel plugin (plugin: signal)",
    "plugins.entries.talk-voice": "Manage Talk voice selection (list/set). (plugin: talk-voice)",
    "plugins.entries.telegram": "PowerDirector Telegram channel plugin (plugin: telegram)",
    "plugins.entries.thread-ownership": "Prevents multiple agents from responding in the same Slack thread. Uses HTTP calls to the slack-forwarder ownership API. (plugin: thread-ownership)",
    "plugins.entries.tlon": "PowerDirector Tlon/Urbit channel plugin (plugin: tlon)",
    "plugins.entries.twitch": "PowerDirector Twitch channel plugin (plugin: twitch)",
    "plugins.entries.voice-call": "PowerDirector voice-call plugin (plugin: voice-call)",
    "plugins.entries.whatsapp": "PowerDirector WhatsApp channel plugin (plugin: whatsapp)",
    "plugins.entries.zalo": "PowerDirector Zalo channel plugin (plugin: zalo)",
    "plugins.entries.zalouser": "PowerDirector Zalo user channel plugin (plugin: zalouser)",
    "plugins.entries.discord": "PowerDirector Discord channel plugin (plugin: discord)",
    "plugins.entries.lobster": "Typed workflow tool with resumable approvals. (plugin: lobster)",
    "plugins.entries.device-pair": "Generate setup codes and approve device pairing requests. (plugin: device-pair)",

    // Voice Call Plugin Help
    "plugins.entries.voice-call.config.provider": "Use twilio, telnyx, or mock for dev/no-network.",
    "plugins.entries.voice-call.config.fromNumber": "Phone number to use for outbound calls.",
    "plugins.entries.voice-call.config.toNumber": "Default recipient for outbound notify calls.",
    "plugins.entries.voice-call.config.tts.provider": "Deep-merges with messages.tts (Edge is ignored for calls).",
    "plugins.entries.voice-call.config.publicUrl": "Publicly accessible URL for receiving webhooks.",

    // Memory LanceDB Plugin Help
    "plugins.entries.memory-lancedb.config.embedding.apiKey": "API key for OpenAI embeddings (or use ${OPENAI_API_KEY})",
    "plugins.entries.memory-lancedb.config.embedding.model": "OpenAI embedding model to use",
    "plugins.entries.memory-lancedb.config.dbPath": "Path to the LanceDB database directory.",
    "plugins.entries.memory-lancedb.config.autoCapture": "Automatically capture important information from conversations.",
    "plugins.entries.memory-lancedb.config.autoRecall": "Automatically inject relevant memories into context.",
    "plugins.entries.memory-lancedb.config.captureMaxChars": "Maximum message length eligible for auto-capture.",

    // LLM Task Plugin Help
    "plugins.entries.llm-task.config.allowedModels": "Allowlist of provider/model keys like openai-codex/gpt-5.2.",

    // Thread Ownership Plugin Help
    "plugins.entries.thread-ownership.config.forwarderUrl": "Base URL of the slack-forwarder ownership API (default: http://slack-forwarder:8750)",
    "plugins.entries.thread-ownership.config.abTestChannels": "Slack channel IDs where thread ownership is enforced.",

    // Device Pairing Plugin Help
    "plugins.entries.device-pair.config.publicUrl": "Public WebSocket URL used for /pair setup codes (ws/wss or http/https).",

    "plugins.installs": "CLI-managed install metadata (used by `powerdirector plugins update` to locate install sources).",
    // Memory & QMD
    "memory": "Memory backend configuration (global).",
    "memory.backend": "Memory backend (\"builtin\" for PowerDirector embeddings, \"qmd\" for QMD sidecar).",
    "memory.citations": "Default citation behavior (\"auto\", \"on\", or \"off\").",
    "memory.qmd.command": "Path to the qmd binary (default: resolves from PATH).",
    "memory.qmd.includeDefaultMemory": "Whether to automatically index MEMORY.md + memory/**/*.md (default: true).",
    "memory.qmd.paths": "Additional directories/files to index with QMD (path + optional glob pattern).",
    "memory.qmd.paths.path": "Absolute or ~-relative path to index via QMD.",
    "memory.qmd.paths.pattern": "Glob pattern relative to the path root (default: **/*.md).",
    "memory.qmd.paths.name": "Optional stable name for the QMD collection (default derived from path).",
    "memory.qmd.sessions.enabled": "Enable QMD session transcript indexing (experimental, default: false).",
    "memory.qmd.sessions.exportDir": "Override directory for sanitized session exports before indexing.",
    "memory.qmd.sessions.retentionDays": "Retention window for exported sessions before pruning (default: unlimited).",
    "memory.qmd.update.interval": "How often the QMD sidecar refreshes indexes (duration string, default: 5m).",
    "memory.qmd.update.debounceMs": "Minimum delay between successive QMD refresh runs (default: 15000).",
    "memory.qmd.update.onBoot": "Run QMD update once on gateway startup (default: true). ",
    "memory.qmd.update.waitForBootSync": "Block startup until the boot QMD refresh finishes (default: false).",
    "memory.qmd.update.embedInterval": "How often QMD embeddings are refreshed (duration string, default: 60m). Set to 0 to disable periodic embed.",
    "memory.qmd.update.commandTimeoutMs": "Timeout for QMD maintenance commands like collection list/add (default: 30000).",
    "memory.qmd.update.updateTimeoutMs": "Timeout for `qmd update` runs (default: 120000).",
    "memory.qmd.update.embedTimeoutMs": "Timeout for `qmd embed` runs (default: 120000).",
    "memory.qmd.limits.maxResults": "Max QMD results returned to the agent loop (default: 6).",
    "memory.qmd.limits.maxSnippetChars": "Max characters per snippet pulled from QMD (default: 700).",
    "memory.qmd.limits.maxInjectedChars": "Max total characters injected from QMD hits per turn.",
    "memory.qmd.limits.timeoutMs": "Per-query timeout for QMD searches (default: 4000).",
    "memory.qmd.scope": "Session/channel scope for QMD recall (same syntax as session.sendPolicy; default: direct-only).",
};

export function getHint(path: string[], type: 'label' | 'help'): string | undefined {
    const fullPath = path.join('.');
    const lookup = type === 'label' ? FIELD_LABELS : FIELD_HELP;

    // Direct match
    if (lookup[fullPath]) return lookup[fullPath];

    // Wildcard match (e.g. plugins.entries.my-plugin.enabled -> plugins.entries.*.enabled)
    const parts = [...path];
    for (let i = 0; i < parts.length; i++) {
        const backup = parts[i];
        parts[i] = '*';
        const wildcardPath = parts.join('.');
        if (lookup[wildcardPath]) return lookup[wildcardPath];
        parts[i] = backup;
    }

    return undefined;
}
