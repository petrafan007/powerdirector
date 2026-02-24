// AUTOMATICALLY GENERATED Documentation Component for messages
import React from 'react';

const MESSAGE_CONFIGS = [
    {
        path: 'messages.messagePrefix',
        label: 'Message Prefix',
        type: 'string',
        description: 'A global string automatically inserted at the very beginning of every single AI response originating from PowerDirector. This overrides channel-specific prefixes and is universally applied across Discord, Slack, SMS, and Websockets.'
    },
    {
        path: 'messages.responsePrefix',
        label: 'Response Prefix',
        type: 'string',
        description: 'Similar to `messagePrefix`, but specifically prepended only when the LLM is directly replying to a user in a threaded context, rather than initiating a standalone broadcast.'
    },
    {
        path: 'messages.groupChat',
        label: 'Group Chat',
        type: 'object',
        description: 'Global fallback rules governing conversational behavior inside multi-user rooms. If a specific Channel (like Slack or MS Teams) lacks an explicit group policy, the engine reverts to these defaults.'
    },
    {
        path: 'messages.groupChat.mentionPatterns',
        label: 'Mention Patterns',
        type: 'array',
        description: 'An array of RegEx strings that dictate exactly what substrings trigger the bot into action within a crowded group chat. (e.g., `(?i)^@bot` or `!ask`).'
    },
    {
        path: 'messages.groupChat.historyLimit',
        label: 'History Limit',
        type: 'number',
        description: 'Limits how many previous lines of banter the agent ingests when pulled into a group conversation. Setting this too high risks severe token exhaustion and hallucination from unrelated chatter.'
    },
    {
        path: 'messages.queue',
        label: 'Queue',
        type: 'object',
        description: 'The ingress routing layer. Handles incoming message spikes by buffering, throttling, or dropping payloads before they overwhelm the core LLM execution thread.'
    },
    {
        path: 'messages.queue.mode',
        label: 'Mode',
        type: 'Enum: fifo | lifo | priority | drop',
        description: 'Routing strategy when incoming messages exceed processing capacity. `fifo` processes in order. `drop` aggressively ignores new messages if the bot is already busy typing.'
    },
    {
        path: 'messages.queue.byChannel',
        label: 'By Channel',
        type: 'object',
        description: 'Overrides standard global queue constraints by explicitly defining threshold limits specific to individual third-party messaging platforms.'
    },
    {
        path: 'messages.queue.byChannel.whatsapp',
        label: 'Whatsapp',
        type: 'object',
        description: 'Queue settings specifically mitigating WhatsApp Business API rate limit structures.'
    },
    {
        path: 'messages.queue.byChannel.telegram',
        label: 'Telegram',
        type: 'object',
        description: 'Telegram routinely broadcasts massive update bursts upon bot wake-up. This throttles ingestion.'
    },
    {
        path: 'messages.queue.byChannel.discord',
        label: 'Discord',
        type: 'object',
        description: 'Protects the PowerDirector engine against Discord Raid spam by clamping concurrent WebSocket events.'
    },
    {
        path: 'messages.queue.byChannel.irc',
        label: 'Irc',
        type: 'object',
        description: 'Handles high-velocity plaintext IRC flooding.'
    },
    {
        path: 'messages.queue.byChannel.slack',
        label: 'Slack',
        type: 'object',
        description: 'Defines queue pooling when the Slack Event API sends multiple concurrent webhook bursts.'
    },
    {
        path: 'messages.queue.byChannel.mattermost',
        label: 'Mattermost',
        type: 'object',
        description: 'Mattermost rate mitigation rules.'
    },
    {
        path: 'messages.queue.byChannel.signal',
        label: 'Signal',
        type: 'object',
        description: 'Signal queue pooling. Especially required for the slow Java processing daemon.'
    },
    {
        path: 'messages.queue.byChannel.imessage',
        label: 'Imessage',
        type: 'object',
        description: 'macOS SQLite database polling debounce logic.'
    },
    {
        path: 'messages.queue.byChannel.msteams',
        label: 'Msteams',
        type: 'object',
        description: 'Microsoft Bot Framework ingress throttles.'
    },
    {
        path: 'messages.queue.byChannel.webchat',
        label: 'Webchat',
        type: 'object',
        description: 'Front-facing Web UI WebSocket connection pools limit.'
    },
    {
        path: 'messages.queue.debounceMs',
        label: 'Debounce Ms',
        type: 'number',
        description: 'Global timer. If a user presses "Enter" 5 times rapidly, the engine waits this many milliseconds before coalescing them into one logical LLM prompt.'
    },
    {
        path: 'messages.queue.debounceMsByChannel',
        label: 'Debounce Ms By Channel',
        type: 'record',
        description: 'Granular debounce overrides. Typically `1000` ms for slow platforms like Slack, but `250` ms for fast WebSockets.'
    },
    {
        path: 'messages.queue.cap',
        label: 'Cap',
        type: 'number',
        description: 'The maximum length of the waiting queue. If the `cap` is `100` and the 101st message arrives while the LLM is busy, the message is outright rejected.'
    },
    {
        path: 'messages.queue.drop',
        label: 'Drop',
        type: 'Enum: oldest | newest',
        description: 'Determines eviction policy when the `queue.cap` is breached. `oldest` guarantees fresh context; `newest` protects historical thread integrity.'
    },
    {
        path: 'messages.inbound',
        label: 'Inbound',
        type: 'object',
        description: 'Legacy configuration mapping for primitive HTTP ingress controllers.'
    },
    {
        path: 'messages.inbound.debounceMs',
        label: 'Debounce Ms',
        type: 'number',
        description: 'Primitive ingress aggregation timer.'
    },
    {
        path: 'messages.inbound.byChannel',
        label: 'By Channel',
        type: 'record',
        description: 'Channel-specific primitive overrides.'
    },
    {
        path: 'messages.ackReaction',
        label: 'Ack Reaction',
        type: 'string',
        description: 'A global emoji scalar (like `+1` or `robot_face`) used to instantly mark a user\'s message as "Received and Processing" before the LLM actually answers.'
    },
    {
        path: 'messages.ackReactionScope',
        label: 'Ack Reaction Scope',
        type: 'Enum: all | channels | dms | none',
        description: 'Determines precisely where the `ackReaction` appears. You might want acknowledgments in busy group `channels` to prevent duplicate requests, but disable them in `dms` where they feel robotic.'
    },
    {
        path: 'messages.removeAckAfterReply',
        label: 'Remove Ack After Reply',
        type: 'boolean',
        description: 'If `true`, the bot will issue an API call to physically delete its own "Thinking/Check" reaction emoji the moment its actual text response finishes generating.'
    },
    {
        path: 'messages.suppressToolErrors',
        label: 'Suppress Tool Errors',
        type: 'boolean',
        description: 'If a backend Tool (like `run_command` or `fs.read`) forcefully throws an exception, setting this to `true` hides the stack trace from the user, leaving the LLM to gracefully apologize instead.'
    },
    {
        path: 'messages.tts',
        label: 'Tts',
        type: 'object',
        description: 'Global Text-to-Speech execution architecture. Dictates how standard LLM text completions are intercepted and transformed into MP3/WAV physical audio buffers.'
    },
    {
        path: 'messages.tts.auto',
        label: 'Auto',
        type: 'boolean',
        description: 'If `true`, the engine automatically triggers audio generation for EVERY single message outputted to the UI, effectively turning the bot into an audio-only assistant.'
    },
    {
        path: 'messages.tts.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle permitting the existence of the TTS pipeline.'
    },
    {
        path: 'messages.tts.mode',
        label: 'Mode',
        type: 'Enum: stream | file | both',
        description: 'Determines payload delivery. `stream` forces the UI to begin playing audio chunks dynamically via WebSocket. `file` waits for the entire MP3 to compile and attaches it via HTTP.'
    },
    {
        path: 'messages.tts.provider',
        label: 'Provider',
        type: 'Enum: elevenlabs | openai | edge | system',
        description: 'The root backend rendering the synthetic voice. Edge is free (Microsoft Azure API bounds), OpenAI is highly stable, and ElevenLabs offers extreme cinematic realism.'
    },
    {
        path: 'messages.tts.summaryModel',
        label: 'Summary Model',
        type: 'string',
        description: 'If the LLM generates a massive 5000-word essay, this defines a cheaper, faster LLM model (like `gpt-4o-mini`) employed strictly to summarize the essay into a 2-sentence script BEFORE sending it to the expensive TTS provider.'
    },
    {
        path: 'messages.tts.modelOverrides',
        label: 'Model Overrides',
        type: 'object',
        description: 'Security baseline deciding if client API requests can dynamically ask the agent to change its voice or TTS provider on the fly.'
    },
    {
        path: 'messages.tts.modelOverrides.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggle authorizing the UI or REST client to ignore global TTS settings.'
    },
    {
        path: 'messages.tts.modelOverrides.allowText',
        label: 'Allow Text',
        type: 'boolean',
        description: 'Allows clients to override the script text sent to the voice synthesizer.'
    },
    {
        path: 'messages.tts.modelOverrides.allowProvider',
        label: 'Allow Provider',
        type: 'boolean',
        description: 'Allows a client config to switch from `edge` to `openai` dynamically.'
    },
    {
        path: 'messages.tts.modelOverrides.allowVoice',
        label: 'Allow Voice',
        type: 'boolean',
        description: 'Allows changing the Actor (e.g., from "Alloy" to "Echo").'
    },
    {
        path: 'messages.tts.modelOverrides.allowModelId',
        label: 'Allow Model Id',
        type: 'boolean',
        description: 'Allows explicitly setting distinct internal synthesizer models (like `eleven_multilingual_v2`).'
    },
    {
        path: 'messages.tts.modelOverrides.allowVoiceSettings',
        label: 'Allow Voice Settings',
        type: 'boolean',
        description: 'Permits injecting complex voice configurations like Pitch and Expression.'
    },
    {
        path: 'messages.tts.modelOverrides.allowNormalization',
        label: 'Allow Normalization',
        type: 'boolean',
        description: 'Permits altering text spelling mappings (e.g. forcing "vs" to be read as "versus").'
    },
    {
        path: 'messages.tts.modelOverrides.allowSeed',
        label: 'Allow Seed',
        type: 'boolean',
        description: 'Authorizes mathematical seed overrides forcing deterministic inflexion audio.'
    },
    {
        path: 'messages.tts.elevenlabs',
        label: 'Elevenlabs',
        type: 'object',
        description: 'Granular API configuration exclusively governing the ElevenLabs streaming infrastructure.'
    },
    {
        path: 'messages.tts.elevenlabs.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'The highly sensitive API secret accessing your ElevenLabs wallet. Should ideally be passed via `.env` files.'
    },
    {
        path: 'messages.tts.elevenlabs.baseUrl',
        label: 'Base Url',
        type: 'string',
        description: 'REST execution endpoint (e.g., `https://api.elevenlabs.io/v1/text-to-speech`).'
    },
    {
        path: 'messages.tts.elevenlabs.voiceId',
        label: 'Voice Id',
        type: 'string',
        description: 'The literal alphanumeric UUID mapping to a specific custom or pre-made Actor profile.'
    },
    {
        path: 'messages.tts.elevenlabs.modelId',
        label: 'Model Id',
        type: 'string',
        description: 'The rendering engine. `eleven_monolingual_v1` is faster, but `eleven_multilingual_v2` is superior in emotional depth and language switching.'
    },
    {
        path: 'messages.tts.elevenlabs.seed',
        label: 'Seed',
        type: 'number',
        description: 'Randomness number fixing exactly how the AI takes breaths and pauses.'
    },
    {
        path: 'messages.tts.elevenlabs.applyTextNormalization',
        label: 'Apply Text Normalization',
        type: 'Enum: auto | on | off',
        description: 'Toggles ElevenLabs internal regex cleaning (e.g. converting `10/12/24` into "October Twelfth, Twenty Twenty Four").'
    },
    {
        path: 'messages.tts.elevenlabs.languageCode',
        label: 'Language Code',
        type: 'string',
        description: 'Forces the model to adopt a specific accent or native execution grammar.'
    },
    {
        path: 'messages.tts.elevenlabs.voiceSettings',
        label: 'Voice Settings',
        type: 'object',
        description: 'Sliding scale matrices directly altering the AI Actor\'s emotional performance.'
    },
    {
        path: 'messages.tts.elevenlabs.voiceSettings.stability',
        label: 'Stability',
        type: 'number',
        description: 'Increasing this prevents the voice from cracking or randomly yelling, but lowers expressive emotional range.'
    },
    {
        path: 'messages.tts.elevenlabs.voiceSettings.similarityBoost',
        label: 'Similarity Boost',
        type: 'number',
        description: 'Forces the generated clip to sound mathematically closer to the original training audio sample.'
    },
    {
        path: 'messages.tts.elevenlabs.voiceSettings.style',
        label: 'Style',
        type: 'number',
        description: 'Amplifies stylistic traits (like whispering or dramatic pauses). Highly dependent on `v2` models.'
    },
    {
        path: 'messages.tts.elevenlabs.voiceSettings.useSpeakerBoost',
        label: 'Use Speaker Boost',
        type: 'boolean',
        description: 'Raises the decibel ceiling of the final MP3 without clipping.'
    },
    {
        path: 'messages.tts.elevenlabs.voiceSettings.speed',
        label: 'Speed',
        type: 'number',
        description: 'BPM scale altering how quickly the Actor talks.'
    },
    {
        path: 'messages.tts.openai',
        label: 'Openai',
        type: 'object',
        description: 'Configuration specifically mapping to the OpenAI `tts-1` endpoint architecture.'
    },
    {
        path: 'messages.tts.openai.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'Requires a standard OpenAI API key with Audio endpoint privileges.'
    },
    {
        path: 'messages.tts.openai.model',
        label: 'Model',
        type: 'string',
        description: 'Dictates generation speed. `tts-1` is fast and cheap for streaming. `tts-1-hd` produces massive lossless audio files for post-production.'
    },
    {
        path: 'messages.tts.openai.voice',
        label: 'Voice',
        type: 'Enum: alloy | echo | fable | onyx | nova | shimmer',
        description: 'Selects from the hardcoded array of official OpenAI actors.'
    },
    {
        path: 'messages.tts.edge',
        label: 'Edge',
        type: 'object',
        description: 'Configuration hijacking the undocumented Microsoft Edge API endpoint, offering completely free TTS without API keys.'
    },
    {
        path: 'messages.tts.edge.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the Edge API bridge.'
    },
    {
        path: 'messages.tts.edge.voice',
        label: 'Voice',
        type: 'string',
        description: 'String identifying the Azure Neural Voice character (e.g. `en-US-AriaNeural`).'
    },
    {
        path: 'messages.tts.edge.lang',
        label: 'Lang',
        type: 'string',
        description: 'Locale code forcing accent boundaries.'
    },
    {
        path: 'messages.tts.edge.outputFormat',
        label: 'Output Format',
        type: 'string',
        description: 'Forces audio encoding (e.g. `audio-24khz-48kbitrate-mono-mp3`).'
    },
    {
        path: 'messages.tts.edge.pitch',
        label: 'Pitch',
        type: 'string',
        description: 'Relative numeric or percentage string (e.g. `+10Hz`) raising or lowering the speaker\'s voice.'
    },
    {
        path: 'messages.tts.edge.rate',
        label: 'Rate',
        type: 'string',
        description: 'Speed alteration string (e.g. `+20%`).'
    },
    {
        path: 'messages.tts.edge.volume',
        label: 'Volume',
        type: 'string',
        description: 'Decibel alteration string.'
    },
    {
        path: 'messages.tts.edge.saveSubtitles',
        label: 'Save Subtitles',
        type: 'boolean',
        description: 'If `true`, the bridge requests VTT timestamp blocks from Azure and writes them adjacent to the MP3 file.'
    },
    {
        path: 'messages.tts.edge.proxy',
        label: 'Proxy',
        type: 'string',
        description: 'Used to route the HTTP/Websocket requests through an intermediary if Microsoft blocks your server\'s ASN.'
    },
    {
        path: 'messages.tts.edge.timeoutMs',
        label: 'Timeout Ms',
        type: 'number',
        description: 'Absolute connection kill limit.'
    },
    {
        path: 'messages.tts.prefsPath',
        label: 'Prefs Path',
        type: 'string',
        description: 'Points to a physical `.json` user preferences file allowing multiple users spanning the same deployment to utilize completely unique TTS loadouts.'
    },
    {
        path: 'messages.tts.maxTextLength',
        label: 'Max Text Length',
        type: 'number',
        description: 'Safety limit preventing the engine from accidentally racking up a $50 API bill by attempting to TTS generate an entire scraped Wikipedia page.'
    },
    {
        path: 'messages.tts.timeoutMs',
        label: 'Timeout Ms',
        type: 'number',
        description: 'Hard limit for TTS completion waiting before the thread falls back to text-only mode.'
    }
];

export default function MessagesConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Messages Pipeline Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep-dive rules governing text ingestion queues, message filtering matrices, text-to-speech synthesis pipelines, and universal reply mechanics.</p>
            </div>
            <div className="space-y-6">
                {MESSAGE_CONFIGS.map((config) => (
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
