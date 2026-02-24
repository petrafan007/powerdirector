// AUTOMATICALLY GENERATED Documentation Component for talk
import React from 'react';

const TALK_CONFIGS = [
    {
        path: 'talk.voiceId',
        label: 'Voice Id',
        type: 'string',
        description: 'The physical UUID strings mapped directly to downstream Text-to-Speech vendor APIs (e.g. ElevenLabs `21m00Tcm4TlvDq8ikWAM` or OpenAI `alloy`).'
    },
    {
        path: 'talk.voiceAliases',
        label: 'Voice Aliases',
        type: 'record',
        description: 'A powerful map translating intuitive strings into cumbersome UUIDs. Allows an Agent Profile to request `voice: "narrator"` which mathematically resolves into `TxGEqn00Q1...` at runtime.'
    },
    {
        path: 'talk.modelId',
        label: 'Model Id',
        type: 'string',
        description: 'Specific neural model utilized. For ElevenLabs, this distinguishes between standard rendering and their massively low-latency Turbo V2.5 endpoints (`eleven_turbo_v2_5`).'
    },
    {
        path: 'talk.outputFormat',
        label: 'Output Format',
        type: 'string',
        description: 'Hardcoded audio encoding targets strictly dictating bitrates and container wrappers (e.g. `pcm_16000` or `mp3_44100_128`). Essential for compatibility with weird telephony routing.'
    },
    {
        path: 'talk.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'Dedicated authentication bearer tokens explicitly isolated from the main `models` API key arrays, preventing TTS scraping from billing against core LLM chat budgets.'
    },
    {
        path: 'talk.interruptOnSpeech',
        label: 'Interrupt On Speech',
        type: 'boolean',
        description: 'Crucial duplexing matrix. If `true`, when the Web Client physically detects the user microphone becoming active, the Node Server instantly drops the outbound TTS WebSocket stream to simulate a human abruptly stopping mid-sentence when interrupted.'
    }
];

export default function TalkConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Global Audio/TTS Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Core routing parameters determining exactly how outbound text is transformed into Voice using neural engines like ElevenLabs or OpenAI TTS. Controls bitrates, interactive interruptions, and voice dictionary aliases.</p>
            </div>
            <div className="space-y-6">
                {TALK_CONFIGS.map((config) => (
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
