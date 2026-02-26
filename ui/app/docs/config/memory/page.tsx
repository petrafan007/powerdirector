// AUTOMATICALLY GENERATED Documentation Component for memory
import React from 'react';

const MEMORY_CONFIGS = [
    {
        path: 'memory.backend',
        label: 'Backend',
        type: 'Enum: builtin | qmd',
        description: 'The primary storage and retrieval engine for long-term memory. `builtin` uses a local SQLite-based vector store, while `qmd` leverages the high-performance Quantum Metadatabase for advanced semantic operations.'
    },
    {
        path: 'memory.citations',
        label: 'Citations',
        type: 'Enum: auto | on | off',
        description: 'Controls whether the agent should explicitly cite its memory sources in its responses. `auto` lets the agent decide based on the query complexity.'
    },
    {
        path: 'memory.qmd',
        label: 'Qmd',
        type: 'object',
        description: 'Advanced configuration for the Quantum Metadatabase (QMD). This engine constantly analyzes all AI-Human interactions in the background, summarizing massive Chat Histories into dense vector embeddings for instantaneous semantic recall months later.'
    },
    {
        path: 'memory.qmd.command',
        label: 'Command',
        type: 'string',
        description: 'The absolute path to the `qmd` binary on the host system. Required if the backend is set to `qmd`.'
    },
    {
        path: 'memory.qmd.searchMode',
        label: 'Search Mode',
        type: 'Enum: query | search | vsearch',
        description: 'The mathematical strategy used for retrieval. `query` uses standard NLP search, `search` uses hybrid semantic matching, and `vsearch` forces pure geometric vector distance calculation.'
    },
    {
        path: 'memory.qmd.includeDefaultMemory',
        label: 'Include Default Memory',
        type: 'boolean',
        description: 'If enabled, the QMD engine includes global system-wide memories in every search, even if the query is restricted to a specific agent or session.'
    },
    {
        path: 'memory.qmd.paths[].path',
        label: 'Path',
        type: 'string',
        description: 'The explicit JSON path inside the internal Memory Object where this specific vector data is physically bolted onto the Agent\'s prompt context (e.g. `user_preferences`).'
    },
    {
        path: 'memory.qmd.paths[].name',
        label: 'Name',
        type: 'string',
        description: 'Human-readable alias identifying this specific slice of vector memory so the LLM logically understands what it represents.'
    },
    {
        path: 'memory.qmd.paths[].pattern',
        label: 'Pattern',
        type: 'string',
        description: 'Regex gate filtering exactly which incoming queries are actually allowed to trigger a Vector database pull. Prevents wasting OpenAI embedding tokens on simple "hello" messages.'
    },
    {
        path: 'memory.qmd.sessions',
        label: 'Sessions',
        type: 'object',
        description: 'Rules distinguishing how long-term memories are logically partitioned. Separates global knowledge from hyper-specific Thread memory.'
    },
    {
        path: 'memory.qmd.sessions.enabled',
        label: 'Sessions Enabled',
        type: 'boolean',
        description: 'Toggles per-session memory isolation. When active, the agent can recall details from the current conversation thread with much higher precision.'
    },
    {
        path: 'memory.qmd.sessions.retentionDays',
        label: 'Retention Days',
        type: 'number',
        description: 'The number of days to keep session-specific memories before they are either purged or merged into the global long-term memory pool.'
    },
    {
        path: 'memory.qmd.update',
        label: 'Update',
        type: 'object',
        description: 'The background synchronization parameters determining precisely when PowerDirector compresses a standard conversation into a permanent Vector embedding.'
    },
    {
        path: 'memory.qmd.update.interval',
        label: 'Update Interval',
        type: 'string',
        description: 'A Cron-style string or relative time (e.g., `5m`) defining how often the background indexer scans for new chat messages to embed.'
    },
    {
        path: 'memory.qmd.update.onBoot',
        label: 'Update On Boot',
        type: 'boolean',
        description: 'If true, the QMD engine performs a full re-index of all memory sources immediately upon PowerDirector startup.'
    },
    {
        path: 'memory.qmd.limits',
        label: 'Limits',
        type: 'object',
        description: 'Hard ceilings preventing catastrophic context-window blowouts. Enforces maximum character limits on the amount of raw Vector data that can be injected into a single prompt.'
    },
    {
        path: 'memory.qmd.limits.maxResults',
        label: 'Max Results',
        type: 'number',
        description: 'The maximum number of discrete memory fragments retrieved per query.'
    },
    {
        path: 'memory.qmd.limits.maxSnippetChars',
        label: 'Max Snippet Chars',
        type: 'number',
        description: 'The maximum character length for each individual memory snippet injected into the prompt.'
    },
    {
        path: 'memory.qmd.limits.timeoutMs',
        label: 'Timeout Ms',
        type: 'number',
        description: 'The maximum time in milliseconds the system will wait for a QMD search to complete before proceeding without historical context.'
    },
    {
        path: 'memory.qmd.scope.default',
        label: 'Default',
        type: 'Enum: allow | deny',
        description: 'Master binary gate toggling the QMD Vector engine globally.'
    },
    {
        path: 'memory.qmd.scope.rules',
        label: 'Rules',
        type: 'array',
        description: 'Cascading firewall matrix explicitly defining which physical Chat Channels are legally permitted to build and access long-term vector memories.'
    },
    {
        path: 'memory.qmd.scope.rules[].action',
        label: 'Action',
        type: 'string',
        description: 'The enforcement action (`allow` or `deny`) applied if the subsequent `match` criteria physically aligns with the incoming chat parameters.'
    },
    {
        path: 'memory.qmd.scope.rules[].match',
        label: 'Match',
        type: 'object',
        description: 'The strict conditional heuristics evaluating the current LLM context.'
    },
    {
        path: 'memory.qmd.scope.rules[].match.channel',
        label: 'Channel',
        type: 'string',
        description: 'Regex string validating the originating gateway (e.g. `slack_.*`).'
    },
    {
        path: 'memory.qmd.scope.rules[].match.chatType',
        label: 'Chat Type',
        type: 'string',
        description: 'Distinguishes between Direct Messages (`dm`) vs. public room routing (`group`).'
    },
    {
        path: 'memory.qmd.scope.rules[].match.keyPrefix',
        label: 'Key Prefix',
        type: 'string',
        description: 'Validates against the internal cryptographic namespace indexing the database segment.'
    },
    {
        path: 'memory.qmd.scope.rules[].match.rawKeyPrefix',
        label: 'Raw Key Prefix',
        type: 'string',
        description: 'Absolute raw namespace targeting, bypassing normal middleware path abstraction.'
    }
];

export default function MemoryConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">RAG and Vector DB Search Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep architecture routing for the native QMD (Quantum Metadatabase) Long-Term Memory Engine. These vectors control when background jobs autonomously compress chat histories into Semantic Embeddings, and define the firewall criteria governing when the LLM is legally allowed to search them during inference.</p>
            </div>
            <div className="space-y-6">
                {MEMORY_CONFIGS.map((config) => (
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
