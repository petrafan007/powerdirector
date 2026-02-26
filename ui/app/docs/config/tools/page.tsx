// AUTOMATICALLY GENERATED Documentation Component for tools
import React from 'react';

const TOOLS_CONFIGS = [
    {
        path: 'tools.web.search',
        label: 'Search',
        type: 'object',
        description: 'Global configuration for the built-in web scraping and search ingestion toolchain, granting agents the capacity to natively look up real-time information.'
    },
    {
        path: 'tools.web.search.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle authorizing the `web_search` native tool. If `false`, agents live entirely within their trained parametric memory boundaries.'
    },
    {
        path: 'tools.web.search.provider',
        label: 'Provider',
        type: 'Enum: duckduckgo | google | bing | perplexity | grok',
        description: 'Selects the exact backend search API. `duckduckgo` is free but often blocks headless scrapers. `perplexity` provides vastly superior synthesized answers but costs money.'
    },
    {
        path: 'tools.web.search.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'Authentication token required if choosing a paid provider like Google Custom Search or Bing.'
    },
    {
        path: 'tools.web.search.maxResults',
        label: 'Max Results',
        type: 'number',
        description: 'Hard limit on the number of URL items or text snippets fetched and appended into the LLM context window to prevent catastrophic token overflows.'
    },
    {
        path: 'tools.web.search.timeoutSeconds',
        label: 'Timeout Seconds',
        type: 'number',
        description: 'Forces the search tool to fail gracefully if the external Provider API hangs for longer than this duration, returning control to the LLM to apologize.'
    },
    {
        path: 'tools.web.search.cacheTtlMinutes',
        label: 'Cache Ttl Minutes',
        type: 'number',
        description: 'How long identical search queries (e.g., "Current weather in NYC") remain cached in local memory, dramatically reducing API costs for repetitive user queries.'
    },
    {
        path: 'tools.web.search.perplexity',
        label: 'Perplexity',
        type: 'object',
        description: 'Override matrix specifically for the Perplexity AI API backend.'
    },
    {
        path: 'tools.web.search.perplexity.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'Dedicated Perplexity Bearer token.'
    },
    {
        path: 'tools.web.search.perplexity.baseUrl',
        label: 'Base Url',
        type: 'string',
        description: 'Overrides standard Perplexity REST paths.'
    },
    {
        path: 'tools.web.search.perplexity.model',
        label: 'Model',
        type: 'string',
        description: 'Specific model class (e.g. `sonar-pro` or `sonar-reasoning`).'
    },
    {
        path: 'tools.web.search.grok',
        label: 'Grok',
        type: 'object',
        description: 'Configuration specifically for the X/Twitter Grok real-time API.'
    },
    {
        path: 'tools.web.search.grok.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'xAI Developer API Key.'
    },
    {
        path: 'tools.web.search.grok.model',
        label: 'Model',
        type: 'string',
        description: 'Target identifier (e.g. `grok-2-latest`).'
    },
    {
        path: 'tools.web.search.grok.inlineCitations',
        label: 'Inline Citations',
        type: 'boolean',
        description: 'Toggles whether Grok API responses should meticulously inject `[1]`, `[2]` bracketed citation sources mapping to Twitter posts.'
    },
    {
        path: 'tools.web.fetch',
        label: 'Fetch',
        type: 'object',
        description: 'Controls the `fetch_url` native capability, allowing the LLM to scrape and read the literal HTML/Markdown contents of a specific web URL.'
    },
    {
        path: 'tools.web.fetch.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the Web Fetcher tool globally.'
    },
    {
        path: 'tools.web.fetch.maxChars',
        label: 'Max Chars',
        type: 'number',
        description: 'Instructs the scraper to aggressively slice and discard website text beyond this limit before feeding it into the LLM, protecting Context Windows.'
    },
    {
        path: 'tools.web.fetch.maxCharsCap',
        label: 'Max Chars Cap',
        type: 'number',
        description: 'Absolute ceiling limit preventing Agents from dynamically trying to bypass their own `maxChars` limits when invoking the fetching tool.'
    },
    {
        path: 'tools.web.fetch.timeoutSeconds',
        label: 'Timeout Seconds',
        type: 'number',
        description: 'Hang-protection if the target server is tarpitting the Agent connection or is caught in an infinite loading loop.'
    },
    {
        path: 'tools.web.fetch.cacheTtlMinutes',
        label: 'Cache Ttl Minutes',
        type: 'number',
        description: 'Local memory retention timeframe for fetched payloads.'
    },
    {
        path: 'tools.web.fetch.maxRedirects',
        label: 'Max Redirects',
        type: 'number',
        description: 'Limits how many times the scraper will follow HTTP 301/302 redirects before giving up, preventing infinite loop traps.'
    },
    {
        path: 'tools.web.fetch.userAgent',
        label: 'User Agent',
        type: 'string',
        description: 'Spoofs the physical HTTP User-Agent string (e.g., impersonating standard Google Chrome) to bypass primitive bot-blocking WAF schemas.'
    },
    {
        path: 'tools.media',
        label: 'Media',
        type: 'object',
        description: 'Massive subsystem defining exactly how Image, Audio, and Video files uploaded into Slack/Discord are ingested, OCR\'d, or transcribed by secondary AI models before being handed to the main Agent.'
    },
    {
        path: 'tools.media.image',
        label: 'Image',
        type: 'object',
        description: 'Controls ingestion bounds for visual files (JPG/PNG/WEBP).'
    },
    {
        path: 'tools.media.image.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'If `false`, any uploaded images are entirely hidden from the AI Agent.'
    },
    {
        path: 'tools.media.image.maxBytes',
        label: 'Max Bytes',
        type: 'number',
        description: 'Memory ceiling preventing users from crashing the server by uploading absurdly massive 8K RAW photo files.'
    },
    {
        path: 'tools.media.audio',
        label: 'Audio',
        type: 'object',
        description: 'Controls ingest pipelines for voice memos (WAV/MP3/M4A), routing them through transcription AIs (like Whisper) before feeding the transcript to the primary Agent.'
    },
    {
        path: 'tools.media.audio.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles audio memo parsing globally.'
    },
    {
        path: 'tools.media.audio.maxBytes',
        label: 'Max Bytes',
        type: 'number',
        description: 'Safety cap preventing 3-hour long podcast uploads from bankrupting the Whisper API tier.'
    },
    {
        path: 'tools.media.video',
        label: 'Video',
        type: 'object',
        description: 'Handles MP4/MOV files by slicing them into frame arrays or stripping the audio track for Whisper transcription.'
    },
    {
        path: 'tools.media.video.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles video ingestion entirely.'
    },
    {
        path: 'tools.links',
        label: 'Links',
        type: 'object',
        description: 'Determines if the LLM is allowed to passively "read" standard URLs that a user randomly pastes into the chat, even if the user doesn\'t explicitly ask the bot to search it.'
    },
    {
        path: 'tools.links.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Activates automatic passive URL unfurling and reading.'
    },
    {
        path: 'tools.sessions',
        label: 'Sessions',
        type: 'object',
        description: 'Handles cross-thread boundary scopes.'
    },
    {
        path: 'tools.sessions.visibility',
        label: 'Visibility',
        type: 'Enum: thread | global',
        description: 'Dictates whether the Agent can use tools to look across different database threads. `global` lets the agent remember what another user said in a different DM.'
    },
    {
        path: 'tools.message',
        label: 'Message',
        type: 'object',
        description: 'Rules for the `send_message` capability.'
    },
    {
        path: 'tools.message.allowCrossContextSend',
        label: 'Allow Cross Context Send',
        type: 'boolean',
        description: 'Permits the Agent to natively DM a separate user while actively talking to you in a group chat.'
    },
    {
        path: 'tools.agentToAgent',
        label: 'Agent To Agent',
        type: 'object',
        description: 'Governs whether an Agent can independently @mention and spawn another completely separate PowerDirector Agent.'
    },
    {
        path: 'tools.agentToAgent.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'If `true`, two agents can theoretically loop infinitely talking to each other unless explicitly architected out.'
    },
    {
        path: 'tools.elevated',
        label: 'Elevated',
        type: 'object',
        description: 'Highly restrictive matrix controlling strictly lethal system tools (like writing files or deleting databases).'
    },
    {
        path: 'tools.elevated.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master kill-switch. If `false`, NO agent can use ANY elevated capabilities regardless of the user asking.'
    },
    {
        path: 'tools.elevated.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'Must match UUIDs or Emails of Administrators. Standard users asking the bot to write a file will instantly throw a Permission Denied error explicitly generated by the Tool architecture.'
    },
    {
        path: 'tools.exec',
        label: 'Exec',
        type: 'object',
        description: 'Massively dangerous configuration governing the `run_command` Node `child_process.exec()` capabilities.'
    },
    {
        path: 'tools.exec.host',
        label: 'Host',
        type: 'boolean',
        description: 'If `true`, the Agent directly mutates the physical Linux server where PowerDirector resides.'
    },
    {
        path: 'tools.exec.security',
        label: 'Security',
        type: 'Enum: strict | relaxed | none',
        description: 'Dictates heuristics. `strict` entirely bans generic commands like `rm` and only permits mapped safe binaries.'
    },
    {
        path: 'tools.exec.ask',
        label: 'Ask',
        type: 'boolean',
        description: 'If `true`, ANY execution attempt instantly halts the LLM generation and pops up an explicit Approval Request GUI button in the chat for the human to accept or deny.'
    },
    {
        path: 'tools.exec.node',
        label: 'Node',
        type: 'boolean',
        description: 'Permits executing raw invisible JavaScript evaluation payloads via `node -e`.'
    },
    {
        path: 'tools.fs',
        label: 'Fs',
        type: 'object',
        description: 'Filesystem boundaries for native read/write tools.'
    },
    {
        path: 'tools.fs.workspaceOnly',
        label: 'Workspace Only',
        type: 'boolean',
        description: 'If `true`, strictly chroots the Agent into a specific subdirectory, rendering it physically impossible to `cat /etc/passwd`.'
    },
    {
        path: 'tools.subagents',
        label: 'Subagents',
        type: 'object',
        description: 'Defines exactly which tools an autonomous sub-agent (like a background summarizer) is legally allowed to spawn with. Often heavily restricted compared to the master interactive agent.'
    },
    {
        path: 'tools.sandbox',
        label: 'Sandbox',
        type: 'object',
        description: 'Defines the exact tool whitelist explicitly permitted when executing inside secure Dockerized evaluation containers.'
    }
];

export default function ToolsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Global Tools Control</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Absolute system-level constraints managing the physical capabilities of AI agents. Governs precisely what external APIs, filesystem bounds, and executable binaries the LLMs are authorized to leverage in production.</p>
            </div>
            <div className="space-y-6">
                {TOOLS_CONFIGS.map((config) => (
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
