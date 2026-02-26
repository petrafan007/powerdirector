// AUTOMATICALLY GENERATED Documentation Component for plugins
import React from 'react';

const PLUGIN_CATEGORIES = [
    {
        title: "Global Plugin Settings",
        description: "Core configurations managing the lifecycle, permissions, and routing for all PowerDirector plugins.",
        items: [
            {
                path: 'plugins.enabled',
                label: 'Enabled',
                type: 'boolean',
                description: 'Global master toggle for the entire PowerDirector plugin subsystem. When set to `false`, no external logic extensions or community plugins are loaded, regardless of their individual statuses in the `entries` map.'
            },
            {
                path: 'plugins.allow',
                label: 'Allow',
                type: 'array',
                description: 'A whitelist of specific plugin identifiers permitted to load. If this array is non-empty, ONLY plugins listed here will be initialized. Useful for locked-down production environments.'
            },
            {
                path: 'plugins.deny',
                label: 'Deny',
                type: 'array',
                description: 'A blacklist of plugin identifiers that are strictly forbidden from loading. Deny rules take precedence over allow rules.'
            },
            {
                path: 'plugins.load.paths',
                label: 'Load Paths',
                type: 'array',
                description: 'Specific filesystem paths or package names to be dynamically imported as plugins. This serves as the manual registration vector for plugins not managed by the internal installer.'
            },
            {
                path: 'plugins.slots.memory',
                label: 'Memory Slot',
                type: 'string',
                description: 'Assigns a specific plugin to the global "memory" slot. This determines which underlying technology (e.g., `memory-lancedb` or `memory-core`) PowerDirector uses for its primary vector operations.'
            },
            {
                path: 'plugins.installs',
                label: 'Installs',
                type: 'record',
                description: 'The internal state tracking for plugins managed via the PowerDirector CLI or Admin UI installation tools. It records source origins, physical install paths, and version metadata for automated lifecycle management.'
            }
        ]
    },
    {
        title: "LLM Task Plugin",
        description: "Autonomous orchestration for headless background LLM executions independently of interactive chat sessions.",
        items: [
            {
                path: 'plugins.entries.llm-task.config.enabled',
                label: 'Enabled',
                type: 'boolean',
                description: 'Toggles the autonomous \'llm-task\' plugin, which orchestrates headless background LLM executions (data extraction, summarization) independently of interactive chat sessions.'
            },
            {
                path: 'plugins.entries.llm-task.config.defaultProvider',
                label: 'Default Provider',
                type: 'string',
                description: 'If a background task doesn\'t specify an API provider, the plugin defaults to this routing (e.g. `openai`).'
            },
            {
                path: 'plugins.entries.llm-task.config.defaultModel',
                label: 'Default Model',
                type: 'string',
                description: 'The fallback generative model (e.g., `gpt-4o-mini`) used to save money on background Cron tasks.'
            },
            {
                path: 'plugins.entries.llm-task.config.defaultAuthProfileId',
                label: 'Default Auth Profile Id',
                type: 'string',
                description: 'Failsafe mapping to an internal API Key bucket if the task lacks explicit credentials.'
            },
            {
                path: 'plugins.entries.llm-task.config.maxTokens',
                label: 'Max Tokens',
                type: 'number',
                description: 'Hard limit preventing a runaway background LLM task from burning thousands of API credits.'
            },
            {
                path: 'plugins.entries.llm-task.config.timeoutMs',
                label: 'Timeout Ms',
                type: 'number',
                description: 'Physical thread killswitch. If the LLM provider API hangs for this many milliseconds, the plugin forcefully throws a timeout Exception.'
            },
            {
                path: 'plugins.entries.llm-task.config.allowedModels',
                label: 'Allowed Models',
                type: 'array',
                description: 'A restrictive whitelist of model identifiers that the LLM Task plugin is permitted to utilize. If empty, the plugin is granted access to all system-wide models.'
            }
        ]
    },
    {
        title: "Memory LanceDB Plugin",
        description: "Highly optimized LanceDB embedded vector database for zero-latency semantic search.",
        items: [
            {
                path: 'plugins.entries.memory-lancedb.config.enabled',
                label: 'Enabled',
                type: 'boolean',
                description: 'Toggles the highly optimized LanceDB embedded vector database plugin. Replaces sluggish remote Pinecone/Weaviate queries with zero-latency local disk `.lance` parquet reads.'
            },
            {
                path: 'plugins.entries.memory-lancedb.config.embedding',
                label: 'Embedding',
                type: 'object',
                description: 'Routing configuration linking LanceDB\'s native embedding algorithms to specific external providers (like OpenAI `text-embedding-3-small` or local ONNX models).'
            },
            {
                path: 'plugins.entries.memory-lancedb.config.dbPath',
                label: 'DB Path',
                type: 'string',
                description: 'The absolute path on disk where the LanceDB Parquet files are stored. Replaces the default internal storage path if a dedicated high-speed NVMe mount is preferred.'
            },
            {
                path: 'plugins.entries.memory-lancedb.config.autoCapture',
                label: 'Auto Capture',
                type: 'boolean',
                description: 'Enables asynchronous, background ingestion of chat messages. When active, every user interaction is automatically embedded and stored in the vector graph without requiring manual triggers.'
            },
            {
                path: 'plugins.entries.memory-lancedb.config.autoRecall',
                label: 'Auto Recall',
                type: 'boolean',
                description: 'Determines if the agent should automatically query LanceDB for relevant context during the initial prompt construction, injecting semantic "memories" before the LLM generates a response.'
            },
            {
                path: 'plugins.entries.memory-lancedb.config.captureMaxChars',
                label: 'Capture Max Chars',
                type: 'number',
                description: 'The maximum string length for a single chat message permitted for auto-capture. Prevents the vector database from becoming polluted with massive logs or multi-megabyte code dumps.'
            }
        ]
    },
    {
        title: "Thread Ownership Plugin",
        description: "Mutex lock plugin to prevent multiple agents from responding simultaneously in shared channels.",
        items: [
            {
                path: 'plugins.entries.thread-ownership.config.enabled',
                label: 'Enabled',
                type: 'boolean',
                description: 'Activates the \'Thread Ownership\' mutex lock plugin. When 5 distinct Agents exist in one Slack channel, this plugin uses heuristics to mathematically ensure only ONE agent replies, preventing chaotic overlapping AI spam.'
            },
            {
                path: 'plugins.entries.thread-ownership.config.forwarderUrl',
                label: 'Forwarder Url',
                type: 'string',
                description: 'The destination API endpoint for the Thread Ownership mutex coordinator. Used in distributed cluster environments where multiple PowerDirector nodes must synchronize response locks.'
            },
            {
                path: 'plugins.entries.thread-ownership.config.abTestChannels',
                label: 'AB Test Channels',
                type: 'array',
                description: 'A list of channel IDs where thread ownership logic is being evaluated in a non-destructive "shadow mode" before global activation.'
            }
        ]
    },
    {
        title: "Voice Call Plugin",
        description: "Massive native SIP Telephony engine allowing PowerDirector to interface with physical phone calls.",
        items: [
            {
                path: 'plugins.entries.voice-call.config.enabled',
                label: 'Enabled',
                type: 'boolean',
                description: 'Master toggle for the massive native SIP Telephony plugin. Allows PowerDirector to physically answer real-world phone calls via SIP trunks.'
            },
            {
                path: 'plugins.entries.voice-call.config.provider',
                label: 'Provider',
                type: 'Enum: telnyx | twilio | plivo | mock',
                description: 'The SIP carrier used for routing calls. `telnyx` and `twilio` are first-class providers, while `mock` allows for local development without consuming carrier credits.'
            },
            {
                path: 'plugins.entries.voice-call.config.fromNumber',
                label: 'From Number',
                type: 'string',
                description: 'The E.164 formatted phone number (e.g., `+15551234567`) that the agent uses as its Caller ID when initiating outbound dials.'
            },
            {
                path: 'plugins.entries.voice-call.config.toNumber',
                label: 'To Number',
                type: 'string',
                description: 'The default destination phone number for notifications or automated alerts if no specific recipient is provided.'
            },
            {
                path: 'plugins.entries.voice-call.config.telnyx',
                label: 'Telnyx',
                type: 'object',
                description: 'Routing credentials specifically for the Telnyx carrier.'
            },
            {
                path: 'plugins.entries.voice-call.config.telnyx.apiKey',
                label: 'Api Key',
                type: 'string',
                description: 'Bearer token authorizing PowerDirector to manipulate Telnyx SIP routing numbers.'
            },
            {
                path: 'plugins.entries.voice-call.config.telnyx.connectionId',
                label: 'Connection Id',
                type: 'string',
                description: 'The physical SIP Trunk UUID binding the API key to a specific data center.'
            },
            {
                path: 'plugins.entries.voice-call.config.telnyx.publicKey',
                label: 'Public Key',
                type: 'string',
                description: 'Cryptographic key verifying incoming webhooks genuinely originated from Telnyx servers.'
            },
            {
                path: 'plugins.entries.voice-call.config.twilio',
                label: 'Twilio',
                type: 'object',
                description: 'Routing credentials specifically for the Twilio carrier via TwiML bin generation.'
            },
            {
                path: 'plugins.entries.voice-call.config.twilio.accountSid',
                label: 'Account Sid',
                type: 'string',
                description: 'Primary identifier for the Twilio Project sandbox.'
            },
            {
                path: 'plugins.entries.voice-call.config.twilio.authToken',
                label: 'Auth Token',
                type: 'string',
                description: 'The secret validating Twilio webhook signatures.'
            },
            {
                path: 'plugins.entries.voice-call.config.plivo',
                label: 'Plivo',
                type: 'object',
                description: 'Routing credentials for the Plivo SIP interconnect.'
            },
            {
                path: 'plugins.entries.voice-call.config.inboundPolicy',
                label: 'Inbound Policy',
                type: 'Enum: accept | reject_all | whitelist',
                description: 'Security firewall dictating if PowerDirector should physically answer ringing phone numbers, or instantly send `486 Busy Here` headers.'
            },
            {
                path: 'plugins.entries.voice-call.config.allowFrom',
                label: 'Allow From',
                type: 'array',
                description: 'If `inboundPolicy` is `whitelist`, this is the exact array of E.164 phone numbers mathematically granted permission to wake up the AI.'
            },
            {
                path: 'plugins.entries.voice-call.config.inboundGreeting',
                label: 'Inbound Greeting',
                type: 'string',
                description: 'The very first string the TTS engine rapidly Synthesizes to audio when answering a call (e.g. "Hello, how can I help?").'
            },
            {
                path: 'plugins.entries.voice-call.config.outbound',
                label: 'Outbound',
                type: 'object',
                description: 'Parameters dictating how an Agent can autonomously decide to dial physical phone numbers.'
            },
            {
                path: 'plugins.entries.voice-call.config.outbound.defaultMode',
                label: 'Default Mode',
                type: 'Enum: call_and_bridge | ai_agent',
                description: 'If `ai_agent`, the LLM physically talks on the line. If `call_and_bridge`, the system just acts as an automated PBX, dialing users and connecting them together without AI intervention.'
            },
            {
                path: 'plugins.entries.voice-call.config.maxDurationSeconds',
                label: 'Max Duration Seconds',
                type: 'number',
                description: 'Absolute killswitch. If a malicious user traps the AI in a logic loop over the phone, the SIP trunk violently drops the call after this threshold to save per-minute carrier costs.'
            },
            {
                path: 'plugins.entries.voice-call.config.silenceTimeoutMs',
                label: 'Silence Timeout Ms',
                type: 'number',
                description: 'VAD (Voice Activity Detection) tuning. The exact millisecond threshold of silence required before the AI mathematically assumes the user has finished speaking their sentence.'
            },
            {
                path: 'plugins.entries.voice-call.config.transcriptTimeoutMs',
                label: 'Transcript Timeout Ms',
                type: 'number',
                description: 'Fallback timer waiting on cloud STT (Speech-to-Text) vendors to return strings before throwing processing exceptions.'
            },
            {
                path: 'plugins.entries.voice-call.config.ringTimeoutMs',
                label: 'Ring Timeout Ms',
                type: 'number',
                description: 'The duration the system will allow a phone to ring before abandoning an outbound call attempt.'
            },
            {
                path: 'plugins.entries.voice-call.config.maxConcurrentCalls',
                label: 'Max Concurrent Calls',
                type: 'number',
                description: 'Limits the number of simultaneous active SIP sessions to prevent overloading system resources or exceeding carrier trunk capacity.'
            },
            {
                path: 'plugins.entries.voice-call.config.serve.port',
                label: 'Serve Port',
                type: 'number',
                description: 'The isolated, dedicated HTTP Express port explicitly listening exclusively for Twilio/Telnyx Webhooks.'
            },
            {
                path: 'plugins.entries.voice-call.config.tailscale.mode',
                label: 'Tailscale Mode',
                type: 'string',
                description: 'If active, the Voice plugin binds its webhook listener exclusively to a generic internal Tailscale Wireguard interface rather than hitting the public internet.'
            },
            {
                path: 'plugins.entries.voice-call.config.tunnel.provider',
                label: 'Tunnel Provider',
                type: 'Enum: ngrok | cloudflare | localtunnel',
                description: 'Automated localhost tunneling for developers testing SIP calls behind steep NAT firewalls without port forwarding.'
            },
            {
                path: 'plugins.entries.voice-call.config.streaming.enabled',
                label: 'Streaming Enabled',
                type: 'boolean',
                description: 'Toggles full WebRTC/WebSocket multiplexing for ultra-low latency conversational AI vs slow sequential MP3 polling.'
            },
            {
                path: 'plugins.entries.voice-call.config.streaming.sttProvider',
                label: 'Streaming STT Provider',
                type: 'Enum: openai-realtime',
                description: 'The specialized engine used for real-time, low-latency speech transcription during an active call stream.'
            },
            {
                path: 'plugins.entries.voice-call.config.streaming.silenceDurationMs',
                label: 'Streaming Silence Duration Ms',
                type: 'number',
                description: 'The threshold of sustained silence in a stream required to trigger a "User Finished Speaking" event in real-time mode.'
            },
            {
                path: 'plugins.entries.voice-call.config.publicUrl',
                label: 'Public Url',
                type: 'string',
                description: 'The external-facing base URL used for callback webhooks. Required for carriers to reach the local PowerDirector instance.'
            },
            {
                path: 'plugins.entries.voice-call.config.skipSignatureVerification',
                label: 'Skip Signature Verification',
                type: 'boolean',
                description: 'Security override that bypasses carrier-specific cryptographic header checks. Should only be enabled during local debugging.'
            },
            {
                path: 'plugins.entries.voice-call.config.stt.provider',
                label: 'STT Provider',
                type: 'string',
                description: 'The specific neural Speech-To-Text transcription engine (e.g. `deepgram_nova_2`, `whisper-v3`).'
            },
            {
                path: 'plugins.entries.voice-call.config.tts.mode',
                label: 'TTS Mode',
                type: 'string',
                description: 'Defines if the text-to-speech engine prioritizes speed (`streaming`) or quality (`buffered_sentences`).'
            },
            {
                path: 'plugins.entries.voice-call.config.tts.elevenlabs.voiceId',
                label: 'ElevenLabs Voice ID',
                type: 'string',
                description: 'The exact synthetic clone UUID representing the agent\'s vocal cords.'
            },
            {
                path: 'plugins.entries.voice-call.config.tts.edge.enabled',
                label: 'Edge TTS Enabled',
                type: 'boolean',
                description: 'Failsafe utilizing Microsoft Edge browser\'s hidden internal TTS API for completely free, unlimited synthetic voice generation during development.'
            },
            {
                path: 'plugins.entries.voice-call.config.responseModel',
                label: 'Response Model',
                type: 'string',
                description: 'Overrides the default Agent model for phone interactions, typically used to select faster, lower-latency models for conversational fluidity.'
            },
            {
                path: 'plugins.entries.voice-call.config.responseTimeoutMs',
                label: 'Response Timeout Ms',
                type: 'number',
                description: 'Hard limit on how long the system will wait for an LLM response before playing a "thinking" audio filler or hanging up.'
            }
        ]
    },
    {
        title: "Device Pair Plugin",
        description: "Headless authentication bridging for external displays using ephemeral codes.",
        items: [
            {
                path: 'plugins.entries.device-pair.config.enabled',
                label: 'Enabled',
                type: 'boolean',
                description: 'Toggles the headless Device Pairing plugin, allowing external displays/terminals to securely acquire Auth Tokens via ephemeral 6-digit PIN codes or QR matrices.'
            },
            {
                path: 'plugins.entries.device-pair.config.publicUrl',
                label: 'Public Url',
                type: 'string',
                description: 'The external-facing URL used to generate QR codes for device pairing. If behind a proxy or tunnel, this should be the public entry point (e.g., `https://pd.example.com`).'
            }
        ]
    }
];

export default function PluginsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Plugins</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep integrations handling dynamically injected PowerDirector logic. These parameters structure the physical array of loaded plugins and provide explicit granular configuration vectors for massive community extensions like the LanceDB embedded vector store, device pairing flows, and the comprehensive SIP Telephony Voice AI engine.</p>
            </div>
            <div className="space-y-12">
                {PLUGIN_CATEGORIES.map((category) => (
                    <div key={category.title} className="space-y-6">
                        <div className="border-b border-[var(--pd-border)] pb-2 mb-6">
                            <h2 className="text-2xl font-bold text-[var(--pd-text-main)]">{category.title}</h2>
                            <p className="text-[var(--pd-text-muted)] text-[0.95rem] mt-1">{category.description}</p>
                        </div>
                        <div className="space-y-6 pl-4 border-l-2 border-[var(--pd-surface-hover)]">
                            {category.items.map((config) => (
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
                ))}
            </div>
        </div>
    );
}
