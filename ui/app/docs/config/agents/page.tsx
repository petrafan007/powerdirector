// AUTOMATICALLY GENERATED Documentation Component for agents
import React from 'react';

const AGENT_CONFIGS = [
    {
        path: 'agents.defaults',
        label: 'Defaults',
        type: 'object',
        description: 'Global fallback defaults applied to all agent definitions inside the `agents.list` array. If an individual agent profile omits a specific setting (such as a model or a heartbeat interval), the gateway engine will inherit the missing values from this block. Use this to establish baseline security and performance constraints.'
    },
    {
        path: 'agents.list',
        label: 'List',
        type: 'array',
        description: 'The master collection of all defined Agent Engine profiles within this PowerDirector tenant. Each item in this array represents a distinct AI persona, complete with its own dedicated memory vector store, tool access permissions, sandbox configurations, and LLM backends.'
    },
    {
        path: 'agents.list[].id',
        label: 'Id',
        type: 'string',
        description: 'The unique, immutable string identifier for this specific agent profile. This ID is used internally across database relations, WebSockets routing, and routing tags. Once an ID is created and data is associated with it, changing the ID will orphan all prior conversation histories and vector memories.'
    },
    {
        path: 'agents.list[].default',
        label: 'Default',
        type: 'boolean',
        description: 'A boolean flag indicating if this agent serves as the root fallback for incoming API requests that do not specify an explicit `agentId` target. Only one agent across the entire `agents.list` array should have this property set to `true` at any given time.'
    },
    {
        path: 'agents.list[].name',
        label: 'Name',
        type: 'string',
        description: 'The human-readable display name for the agent, rendered across the PowerDirector Admin UI and client-facing interfaces. Unlike the `id`, the `name` can be changed safely without affecting database relations or system functionality.'
    },
    {
        path: 'agents.list[].workspace',
        label: 'Workspace',
        type: 'string',
        description: 'The absolute file path or virtual directory root that this agent treats as its "home" workspace. When utilizing Local FS tools or Docker sandboxes, this path bounds the agent\'s write accessibility, ensuring it cannot arbitrarily modify root server directories.'
    },
    {
        path: 'agents.list[].agentDir',
        label: 'Agent Dir',
        type: 'string',
        description: 'An internal state directory path specifically reserved for the agent\'s runtime data, caching mechanisms, and temporary scratchpad files. Unlike the `workspace`, this directory is typically hidden from users and exclusively manipulated by the PowerDirector execution pipeline.'
    },
    {
        path: 'agents.list[].model',
        label: 'Model',
        type: 'string | object',
        description: 'Defines the primary Large Language Model (LLM) backend that powers this agent\'s reasoning and chat completions. This can be a simple string (e.g., `gpt-4o`) if inheriting standard provider configs, or an object containing granular overrides like temperature, top_p, and frequency_penalty.'
    },
    {
        path: 'agents.list[].skills',
        label: 'Skills',
        type: 'array',
        description: 'A list of skill packages assigned to this agent. Skills are compound Tool bundles that group logically related Unix binaries, API wrappers, or Python scripts. Granting a skill (e.g., `git-ops` or `aws-admin`) instantly exposes its entire underlying tool suite to the model.'
    },
    {
        path: 'agents.list[].memorySearch',
        label: 'Memory Search',
        type: 'object',
        description: 'The configuration block governing how this agent performs Retrieval-Augmented Generation (RAG). It determines how the agent indexes its past conversations and external documents, and how it queries that context during active chat sessions to mitigate hallucination.'
    },
    {
        path: 'agents.list[].memorySearch.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle to completely activate or deactivate RAG vector search for this agent. Setting this to `false` forces the agent to rely solely on the raw context window (the chat history sent in the payload) without pulling auxiliary indexed knowledge.'
    },
    {
        path: 'agents.list[].memorySearch.sources',
        label: 'Sources',
        type: 'array',
        description: 'A prioritized list defining which data silos the agent is allowed to query. Typical values include `chat_history`, `workspace_files`, or `external_wiki`. Changing this fundamentally alters the breadth of the agent\'s recall.'
    },
    {
        path: 'agents.list[].memorySearch.extraPaths',
        label: 'Extra Paths',
        type: 'array',
        description: 'Specific absolute or relative directories outside the primary `workspace` that the background indexer should eagerly chunk, embed, and store in the vector database for this agent to reference.'
    },
    {
        path: 'agents.list[].memorySearch.experimental',
        label: 'Experimental',
        type: 'object',
        description: 'Settings governing bleeding-edge memory frameworks such as MemGPT-style tiered episodic memory or automatic background summarization loops. Use with caution as these schemas may change between PowerDirector versions.'
    },
    {
        path: 'agents.list[].memorySearch.experimental.sessionMemory',
        label: 'Session Memory',
        type: 'boolean',
        description: 'Toggles a dynamic short-term memory cache bound strictly to the active WebSocket session, allowing the agent to continuously loop summaries without constantly hitting the heavier persistent Vector DB.'
    },
    {
        path: 'agents.list[].memorySearch.provider',
        label: 'Provider',
        type: 'Enum: openai | local | gemini | voyage',
        description: 'The embedding engine utilized to convert textual knowledge into dense vectors. For cost-efficiency, `local` (e.g., MiniCPM or nomic-embed) is recommended. For high dimensionality and accuracy, `openai` or `voyage` are preferred.'
    },
    {
        path: 'agents.list[].memorySearch.remote',
        label: 'Remote',
        type: 'object',
        description: 'Configuration for external embedding or vector database providers (like Pinecone, Weaviate Cloud, or an external OpenAI API endpoint) that require network travel.'
    },
    {
        path: 'agents.list[].memorySearch.remote.baseUrl',
        label: 'Base Url',
        type: 'string',
        description: 'The specific HTTP/HTTPS endpoint for the remote embedding server. Leave empty to use the provider\'s default standard gateway (e.g., `api.openai.com`).'
    },
    {
        path: 'agents.list[].memorySearch.remote.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'The highly sensitive authentication token required to utilize the remote embedding provider. It is strongly recommended to inject this via a `process.env` reference rather than hardcoding it in the schema.'
    },
    {
        path: 'agents.list[].memorySearch.remote.headers',
        label: 'Headers',
        type: 'record',
        description: 'Custom HTTP headers appended to remote embedding requests. Useful for passing tenant IDs, custom User-Agents, or specific reverse-proxy routing directives.'
    },
    {
        path: 'agents.list[].memorySearch.remote.batch',
        label: 'Batch',
        type: 'object',
        description: 'Governs how large text payloads are chunked and transmitted to the remote API. Batching significantly reduces HTTP overhead and API rate limits by sending arrays of text strings simultaneously.'
    },
    {
        path: 'agents.list[].memorySearch.remote.batch.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles batching logic. If `false`, every single text chunk is serialized into a discrete HTTP request, exponentially increasing network congestion.'
    },
    {
        path: 'agents.list[].memorySearch.remote.batch.wait',
        label: 'Wait',
        type: 'boolean',
        description: 'If `true`, the indexing pipeline halts and blocks thread execution until the batch response fully resolves. Set to `false` for async "fire and forget" background ingestion.'
    },
    {
        path: 'agents.list[].memorySearch.remote.batch.concurrency',
        label: 'Concurrency',
        type: 'number',
        description: 'The maximum number of simultaneous parallel HTTP connections permitted when dispatching embedding batches. Setting this too high risks immediate HTTP 429 Too Many Requests bans from providers.'
    },
    {
        path: 'agents.list[].memorySearch.remote.batch.pollIntervalMs',
        label: 'Poll Interval Ms',
        type: 'number',
        description: 'For asynchronous remote indexers that operate on job queues, this determines how frequently (in milliseconds) PowerDirector asks the remote server if the embedding task is completed.'
    },
    {
        path: 'agents.list[].memorySearch.remote.batch.timeoutMinutes',
        label: 'Timeout Minutes',
        type: 'number',
        description: 'The hard ceiling on how long an embedding batch queue is permitted to hang before the controller throws an exception and cancels the network request.'
    },
    {
        path: 'agents.list[].memorySearch.fallback',
        label: 'Fallback',
        type: 'Enum: openai | gemini | local | voyage | none',
        description: 'Determines the backup embedding pipeline if the primary `provider` fails (e.g., OpenAI API goes down). If set to `local`, the system seamlessly shifts to ONNX-based local generation to maintain uptime.'
    },
    {
        path: 'agents.list[].memorySearch.model',
        label: 'Model',
        type: 'string',
        description: 'The specific model ID to utilize for generating dense vectors (e.g., `text-embedding-3-small` for OpenAI, or `voyage-large-2` for Voyage).'
    },
    {
        path: 'agents.list[].memorySearch.local',
        label: 'Local',
        type: 'object',
        description: 'Configuration block specifically dedicated to on-device, zero-network embedding generation and storage mechanics.'
    },
    {
        path: 'agents.list[].memorySearch.local.modelPath',
        label: 'Model Path',
        type: 'string',
        description: 'The absolute directory path to the pre-downloaded `.onnx` or `.gguf` weights used by local execution frameworks (like Transformers.js or llama.cpp) to generate embeddings locally.'
    },
    {
        path: 'agents.list[].memorySearch.local.modelCacheDir',
        label: 'Model Cache Dir',
        type: 'string',
        description: 'If weights require dynamic downloading, this path specifies the folder where downloaded model shards are permanently cached to prevent repeated bandwidth consumption across boots.'
    },
    {
        path: 'agents.list[].memorySearch.store',
        label: 'Store',
        type: 'object',
        description: 'Defines the actual database or schema layout where computed vector floats and their corresponding metadata texts are permanently stored.'
    },
    {
        path: 'agents.list[].memorySearch.store.driver',
        label: 'Driver',
        type: 'literal',
        description: 'Identifies the database technology storing the vectors. Commonly `sqlite` (with pgvector/sqlite-vss), `postgres` (with pgvector), `qdrant`, `chroma`, or `pinecone`.'
    },
    {
        path: 'agents.list[].memorySearch.store.path',
        label: 'Path',
        type: 'string',
        description: 'For file-based drivers (like SQLite or Local ChromaDB), this dictates the local filesystem path to the `.db` file.'
    },
    {
        path: 'agents.list[].memorySearch.store.vector',
        label: 'Vector',
        type: 'object',
        description: 'Configuration for driver-specific vector extensions, primarily dictating how native C++ binaries interface with local DB instances for cosine similarity math.'
    },
    {
        path: 'agents.list[].memorySearch.store.vector.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Forces the system to initialize the vector math extensions (like `sqlite-vss`). If `false`, the database will only be capable of standard semantic full-text search (BM25), not geometric vector searches.'
    },
    {
        path: 'agents.list[].memorySearch.store.vector.extensionPath',
        label: 'Extension Path',
        type: 'string',
        description: 'Absolute path pointing to the compiled shared object (`.so`, `.dylib`, or `.dll`) for the vector extension plugins, allowing the database driver to link it during runtime.'
    },
    {
        path: 'agents.list[].memorySearch.chunking',
        label: 'Chunking',
        type: 'object',
        description: 'Defines the algorithmic behavior for splitting long documents and chat transcripts into smaller, mathematically sound sizes before embedding.'
    },
    {
        path: 'agents.list[].memorySearch.chunking.tokens',
        label: 'Tokens',
        type: 'number',
        description: 'The maximum number of tokens allowed within a single chunk. Typically set around 512 or 1024, balancing granular retrieval accuracy against semantic context loss.'
    },
    {
        path: 'agents.list[].memorySearch.chunking.overlap',
        label: 'Overlap',
        type: 'number',
        description: 'The number of tokens that duplicate across sequential chunks. E.g., if token size is 500 and overlap is 50, the last 50 tokens of chunk 1 will be the first 50 tokens of chunk 2. Crucial for ensuring natural language sentences are not arbitrarily split in half.'
    },
    {
        path: 'agents.list[].memorySearch.sync',
        label: 'Sync',
        type: 'object',
        description: 'Automated triggers governing when the memory pipeline performs ingestion (reading new chats, reading new files) to ensure the vector graph is always up-to-date.'
    },
    {
        path: 'agents.list[].memorySearch.sync.onSessionStart',
        label: 'On Session Start',
        type: 'boolean',
        description: 'If `true`, opening a new user connection or UI window will synchronously trigger a full Delta check, embedding any unindexed content prior to processing the user\'s first prompt.'
    },
    {
        path: 'agents.list[].memorySearch.sync.onSearch',
        label: 'On Search',
        type: 'boolean',
        description: 'If `true`, the system performs just-in-time micro-indexing right before executing a query. Extremely heavy on latency for large datasets, but guarantees 100% accuracy.'
    },
    {
        path: 'agents.list[].memorySearch.sync.watch',
        label: 'Watch',
        type: 'boolean',
        description: 'Uses filesystem node watchers (like `chokidar`) to continuously listen for `fs.write` events across the Agent workspace and instantly embed new notes or code files in the background.'
    },
    {
        path: 'agents.list[].memorySearch.sync.watchDebounceMs',
        label: 'Watch Debounce Ms',
        type: 'number',
        description: 'Prevents CPU thrashing by delaying the ingestion of rapidly updated files until formatting or typing has paused for this duration (in milliseconds).'
    },
    {
        path: 'agents.list[].memorySearch.sync.intervalMinutes',
        label: 'Interval Minutes',
        type: 'number',
        description: 'A fallback Cron-like timer that periodically sweeps all associated folders and chat tables to ingest anything missed by WebSocket or filesystem events.'
    },
    {
        path: 'agents.list[].memorySearch.sync.sessions',
        label: 'Sessions',
        type: 'object',
        description: 'Threshold limits determining exactly how much conversational history needs to accumulate before it justifies triggering the chunking and embedding math algorithms.'
    },
    {
        path: 'agents.list[].memorySearch.sync.sessions.deltaBytes',
        label: 'Delta Bytes',
        type: 'number',
        description: 'The system will trigger a session memory sync when the unindexed string length of new conversation payloads reaches this byte size.'
    },
    {
        path: 'agents.list[].memorySearch.sync.sessions.deltaMessages',
        label: 'Delta Messages',
        type: 'number',
        description: 'Alternatively, the system will trigger a session memory sync if this specific number of message objects (turns between User and AI) has passed since the last ingestion.'
    },
    {
        path: 'agents.list[].memorySearch.query',
        label: 'Query',
        type: 'object',
        description: 'Fine-tuning parameters adjusting how strict or loose the agent interprets vector distances when injecting RAG context into its active prompt.'
    },
    {
        path: 'agents.list[].memorySearch.query.maxResults',
        label: 'Max Results',
        type: 'number',
        description: 'The maximum `LIMIT` of discrete context blocks the vector database generates. A higher number provides more context to the LLM but significantly consumes the active token window.'
    },
    {
        path: 'agents.list[].memorySearch.query.minScore',
        label: 'Min Score',
        type: 'number',
        description: 'The Cosine Similarity or L2 distance threshold between 0.0 and 1.0. A score of `0.80` ensures only highly relevant, tightly correlated text chunks are returned, rejecting generic noise.'
    },
    {
        path: 'agents.list[].memorySearch.query.hybrid',
        label: 'Hybrid',
        type: 'object',
        description: 'Configuration for Cross-Encoder algorithms that utilize two-pass retrievers. Hybrid search typically merges standard BM25 keyword matching with dense vector math for maximal accuracy.'
    },
    {
        path: 'agents.list[].memorySearch.query.hybrid.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Activates the Reciprocal Rank Fusion (RRF) algorithm to combine text scoring and vector scoring.'
    },
    {
        path: 'agents.list[].memorySearch.query.hybrid.vectorWeight',
        label: 'Vector Weight',
        type: 'number',
        description: 'The ratio weight (usually ~0.7) granted to the dense semantic vector score during RRF sorting. Determines how much "generalized meaning" matters vs. exact keyword matching.'
    },
    {
        path: 'agents.list[].memorySearch.query.hybrid.textWeight',
        label: 'Text Weight',
        type: 'number',
        description: 'The ratio weight (usually ~0.3) granted to BM25 keyword scoring during RRF sorting. Critical for ensuring very specific nouns (like a server IP or niche variable name) aren\'t lost in semantic translation.'
    },
    {
        path: 'agents.list[].memorySearch.query.hybrid.candidateMultiplier',
        label: 'Candidate Multiplier',
        type: 'number',
        description: 'Determines the initial broad search radius. E.g., if set to `10` and `maxResults` is `5`, the database will fetch the top 50 matches and meticulously re-rank them to output the absolute best 5.'
    },
    {
        path: 'agents.list[].memorySearch.cache',
        label: 'Cache',
        type: 'object',
        description: 'An independent in-memory Redis or LRU cache layer dedicated solely to storing redundant, hyper-frequent RAG queries.'
    },
    {
        path: 'agents.list[].memorySearch.cache.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the fast-read LRU cache. Essential for public-facing bots that may constantly be asked identical FAQ questions from hundreds of distinct connections.'
    },
    {
        path: 'agents.list[].memorySearch.cache.maxEntries',
        label: 'Max Entries',
        type: 'number',
        description: 'The ceiling limit for stored cache pairs. Depending on available host Node.js RAM, exceeding this limit forces a FIFO (First In First Out) eviction.'
    },
    {
        path: 'agents.list[].humanDelay',
        label: 'Human Delay',
        type: 'object',
        description: 'UX and safety controls that purposefully throttle the agent\'s response times. This simulates a "human thinking" delay, preventing users from feeling overwhelmed by instant machine-gun macro replies.'
    },
    {
        path: 'agents.list[].humanDelay.mode',
        label: 'Mode',
        type: 'Enum: off | natural | custom',
        description: 'If `natural`, the delay math is scaled sequentially based on the payload character count. If `custom`, it strictly adheres to the min/max bounds. `off` processes immediately at hardware limits.'
    },
    {
        path: 'agents.list[].humanDelay.minMs',
        label: 'Min Ms',
        type: 'number',
        description: 'Absolute minimum millisecond wait time imposed before the server dispatches the WebSocket message event to the frontend client.'
    },
    {
        path: 'agents.list[].humanDelay.maxMs',
        label: 'Max Ms',
        type: 'number',
        description: 'Absolute maximum millisecond wait time, capping delays so that the user does not falsely believe the server has frozen or timed out.'
    },
    {
        path: 'agents.list[].heartbeat',
        label: 'Heartbeat',
        type: 'object',
        description: 'A proactive Cron-like execution loop. Instead of waiting for a user prompt, Heartbeats allow the agent to spontaneously "wake up," inspect its environment, and autonomously message a target channel.'
    },
    {
        path: 'agents.list[].heartbeat.every',
        label: 'Every',
        type: 'string',
        description: 'Accepts exact Cron notation, standard timestamp syntax (e.g., `1h 30m`), or relative semantics outlining the exact timing frequency for internal automated wakeup calls.'
    },
    {
        path: 'agents.list[].heartbeat.activeHours',
        label: 'Active Hours',
        type: 'object',
        description: 'A defensive guardrail ensuring that automated background agents do not spam channels or execute cost-bearing workflows during specific blackout periods (like 3 AM local time).'
    },
    {
        path: 'agents.list[].heartbeat.activeHours.start',
        label: 'Start',
        type: 'string',
        description: 'The 24-hour HH:MM string representing when the agent is permitted to begin its autonomous heartbeat tracking.'
    },
    {
        path: 'agents.list[].heartbeat.activeHours.end',
        label: 'End',
        type: 'string',
        description: 'The 24-hour HH:MM string where all heartbeat loops are paused until the start block arrives the following day.'
    },
    {
        path: 'agents.list[].heartbeat.activeHours.timezone',
        label: 'Timezone',
        type: 'string',
        description: 'The standard TZ database name (e.g., `America/New_York`) to accurately anchor the `start` and `end` times against server UTC drift and Daylight Saving Time.'
    },
    {
        path: 'agents.list[].heartbeat.model',
        label: 'Model',
        type: 'string',
        description: 'Optionally overrides the agent\'s primary LLM solely for heartbeat processing. For example, using expensive `gpt-4o` for chat but downgrading to cheap `gpt-4o-mini` for periodic background scanning.'
    },
    {
        path: 'agents.list[].heartbeat.session',
        label: 'Session',
        type: 'string',
        description: 'Defines whether heartbeats create bespoke isolation threads or append themselves natively into existing active chat interfaces, updating the user\'s ongoing timeline.'
    },
    {
        path: 'agents.list[].heartbeat.includeReasoning',
        label: 'Include Reasoning',
        type: 'boolean',
        description: 'If `true`, the internal thought chain derived from the heartbeat trigger is sent over the wire and persisted to the UI for administrative review.'
    },
    {
        path: 'agents.list[].heartbeat.target',
        label: 'Target',
        type: 'string',
        description: 'The specific platform output destination. Could be `slack_channel`, `discord_webhook`, or `internal_ui`.'
    },
    {
        path: 'agents.list[].heartbeat.to',
        label: 'To',
        type: 'string',
        description: 'The channel ID or internal recipient alias mapping exactly where the Heartbeat should deposit its generated message payloads.'
    },
    {
        path: 'agents.list[].heartbeat.accountId',
        label: 'Account Id',
        type: 'string',
        description: 'Internal relation ID attributing the computing cost of the autonomous heartbeat LLM generation payload back to a specific tenant ledger.'
    },
    {
        path: 'agents.list[].heartbeat.prompt',
        label: 'Prompt',
        type: 'string',
        description: 'The heavily engineered hidden system message prepended exclusively to heartbeat execution runs. This explicitly instructs the model what internal files to check and what criteria justify sending an alert.'
    },
    {
        path: 'agents.list[].heartbeat.ackMaxChars',
        label: 'Ack Max Chars',
        type: 'number',
        description: 'Enforces a strict ceiling on automated heartbeat messages. If the agent\'s background summary attempts to exceed this string length, it is hard-sliced to prevent wall-of-text spamming.'
    },
    {
        path: 'agents.list[].identity',
        label: 'Identity',
        type: 'object',
        description: 'Frontend visual constraints defining the avatar, the chat bubble color schemes, and formatting icons attributed specifically to this agent persona.'
    },
    {
        path: 'agents.list[].identity.name',
        label: 'Name',
        type: 'string',
        description: 'Visual display alias overriding the core semantic Agent `name` for specific specialized contexts inside the view tier.'
    },
    {
        path: 'agents.list[].identity.theme',
        label: 'Theme',
        type: 'string',
        description: 'A hex code or predefined CSS utility token determining the primary highlight color of the Agent\'s UI elements (like focus rings or markdown block quotes).'
    },
    {
        path: 'agents.list[].identity.emoji',
        label: 'Emoji',
        type: 'string',
        description: 'A Unicode scalar character designated as the quick visual shorthand icon when rendering space-constrained navigation lists.'
    },
    {
        path: 'agents.list[].identity.avatar',
        label: 'Avatar',
        type: 'string',
        description: 'Absolute URI path pointing to a static asset, typically a PNG/SVG file, used as the chat profile picture across system interfaces.'
    },
    {
        path: 'agents.list[].groupChat',
        label: 'Group Chat',
        type: 'object',
        description: 'Configuration for environments where multiple Agents and multiple Users share a unified conversational thread, similar to a multi-player Slack channel.'
    },
    {
        path: 'agents.list[].groupChat.mentionPatterns',
        label: 'Mention Patterns',
        type: 'array',
        description: 'Regex evaluators that the Websocket parses to deterministically trigger an agent into processing an execution. (e.g., `^@DevAgent` or `@all`).'
    },
    {
        path: 'agents.list[].groupChat.historyLimit',
        label: 'History Limit',
        type: 'number',
        description: 'To minimize massive token overrun from multi-person chatter, this limits the number of historical lines injected into the agent\'s prompt upon being implicitly mentioned.'
    },
    {
        path: 'agents.list[].subagents',
        label: 'Subagents',
        type: 'object',
        description: 'Controls the delegation orchestration system. Subagents permit a master Agent to spawn child executor routines to solve parallel logic trees dynamically.'
    },
    {
        path: 'agents.list[].subagents.allowAgents',
        label: 'Allow Agents',
        type: 'array',
        description: 'A whitelist `array` isolating exactly which sibling Agents this primary agent is legally permitted to dispatch tasks towards.'
    },
    {
        path: 'agents.list[].subagents.model',
        label: 'Model',
        type: 'string',
        description: 'The overriding LLM model allocated strictly to child subagents. Frequently set to highly optimized reasoning topologies like o3-mini.'
    },
    {
        path: 'agents.list[].subagents.thinking',
        label: 'Thinking',
        type: 'boolean',
        description: 'If `true`, delegates are granted internal chained-logic "thought" space, bypassing fast-fail heuristics in exchange for deep analysis.'
    },
    {
        path: 'agents.list[].sandbox',
        label: 'Sandbox',
        type: 'object',
        description: 'A hyper-critical security boundary. Configuration here determines if tools like interpreters or Web browsers operate natively on the server hardware, or are trapped within isolated, ephemeral Docker jails.'
    },
    {
        path: 'agents.list[].sandbox.mode',
        label: 'Mode',
        type: 'Enum: native | docker | gvisor',
        description: '`native` executes directly via NodeJS on the host OS. Inherently fatal for untrusted workloads. `docker` uses Daemon containers. `gvisor` implements ultra-hardened namespaces for true zero-trust.'
    },
    {
        path: 'agents.list[].sandbox.workspaceAccess',
        label: 'Workspace Access',
        type: 'Enum: readOnly | readWrite | none',
        description: 'Defines the volume bind-mount accessibility between the host PowerDirector filesystem and the internal Sandbox guest filesystem.'
    },
    {
        path: 'agents.list[].sandbox.sessionToolsVisibility',
        label: 'Session Tools Visibility',
        type: 'boolean',
        description: 'If enabled, raw outputs from containerized binaries are bridged to the client via WebSockets for debug evaluation.'
    },
    {
        path: 'agents.list[].sandbox.scope',
        label: 'Scope',
        type: 'string',
        description: 'Logical bound restricting exactly which processes inside a container are traceable by the core PowerDirector supervisor.'
    },
    {
        path: 'agents.list[].sandbox.perSession',
        label: 'Per Session',
        type: 'boolean',
        description: 'If `true`, the system spins up an entirely new stateless Docker container per chat conversation. Eradicated upon WebSocket disconnect.'
    },
    {
        path: 'agents.list[].sandbox.workspaceRoot',
        label: 'Workspace Root',
        type: 'string',
        description: 'The internal Unix path inside the guest sandbox container where the host directories are officially volume mounted.'
    },
    {
        path: 'agents.list[].sandbox.docker',
        label: 'Docker',
        type: 'object',
        description: 'Granular parameters configuring the structural deployment, networking math, and Linux Kernel security parameters of the Docker Engine.'
    },
    {
        path: 'agents.list[].sandbox.docker.image',
        label: 'Image',
        type: 'string',
        description: 'The explicit DockerHub OCI image tag (e.g., `ubuntu:22.04` or `node:20-alpine`) downloaded and utilized to spin up the agent\'s runtime environment.'
    },
    {
        path: 'agents.list[].sandbox.docker.containerPrefix',
        label: 'Container Prefix',
        type: 'string',
        description: 'Arbitrary string prepended to running container names within the Docker daemon to prevent clashes across multi-tenant servers.'
    },
    {
        path: 'agents.list[].sandbox.docker.workdir',
        label: 'Workdir',
        type: 'string',
        description: 'The `WORKDIR` explicitly defined to the Daemon representing the execution starting point for all commands initiated inside the shell.'
    },
    {
        path: 'agents.list[].sandbox.docker.readOnlyRoot',
        label: 'Read Only Root',
        type: 'boolean',
        description: 'If `true`, prevents any `apt-get` or core OS modification by forcing the container\'s root filesystem layer to be utterly immutable.'
    },
    {
        path: 'agents.list[].sandbox.docker.tmpfs',
        label: 'Tmpfs',
        type: 'record',
        description: 'Maps strictly defined directories (like `/tmp`) into physical RAM rather than SSD blocks, yielding immense performance jumps for ephemeral scripts.'
    },
    {
        path: 'agents.list[].sandbox.docker.network',
        label: 'Network',
        type: 'string',
        description: 'Forces the container onto a specific Docker Bridge/Overlay network mapping.'
    },
    {
        path: 'agents.list[].sandbox.docker.user',
        label: 'User',
        type: 'string',
        description: 'Linux User ID/Group ID (e.g., `1000:1000`) bypassing default root permission escalation vectors inside the container.'
    },
    {
        path: 'agents.list[].sandbox.docker.capDrop',
        label: 'Cap Drop',
        type: 'array',
        description: 'List of specific Linux Kernel capabilities dropped via runtime flag (e.g., `NET_RAW`, `SYS_ADMIN`) to mitigate OS-level breakout techniques.'
    },
    {
        path: 'agents.list[].sandbox.docker.env',
        label: 'Env',
        type: 'record',
        description: 'Key-value environmental pairs systematically injected into the guest container upon spin-up, mimicking the host ecosystem parameters.'
    },
    {
        path: 'agents.list[].sandbox.docker.setupCommand',
        label: 'Setup Command',
        type: 'string',
        description: 'The initial bootstrap sequence run internally immediately upon container provisioning, such as `npm install` or executing a DB migration payload.'
    },
    {
        path: 'agents.list[].sandbox.docker.pidsLimit',
        label: 'Pids Limit',
        type: 'number',
        description: 'Hard limit protecting the host machine from classic Fork Bomb DDoS attacks scaling exponentially within the guest architecture.'
    },
    {
        path: 'agents.list[].sandbox.docker.memory',
        label: 'Memory',
        type: 'string',
        description: 'String limiting physical RAM allowance (e.g., `2g` or `512m`). The Docker daemon inherently kills the container (OOMKill) if exceeded.'
    },
    {
        path: 'agents.list[].sandbox.docker.memorySwap',
        label: 'Memory Swap',
        type: 'string',
        description: 'Controls hard disk swap allocation to absorb sudden spikes in RAM usage without immediately crashing the sandbox.'
    },
    {
        path: 'agents.list[].sandbox.docker.cpus',
        label: 'Cpus',
        type: 'number',
        description: 'Decimal floating-point determining exactly how much logical multithreaded capacity the agent can draw. (e.g., `1.5` prevents hogging 3 full cores).'
    },
    {
        path: 'agents.list[].sandbox.docker.ulimits',
        label: 'Ulimits',
        type: 'array',
        description: 'System-level Unix constraint mappings (like max open file handles, `nofile`) passed heavily to container boot commands.'
    },
    {
        path: 'agents.list[].sandbox.docker.seccompProfile',
        label: 'Seccomp Profile',
        type: 'string',
        description: 'Path pointing to JSON outlining explicitly whitelist/blacklist C syscalls available to the guest kernel interface layer.'
    },
    {
        path: 'agents.list[].sandbox.docker.apparmorProfile',
        label: 'Apparmor Profile',
        type: 'string',
        description: 'Mandatory Access Control flag. AppArmor binds strict network or file traversal restrictions regardless of standard Unix CHMOD settings.'
    },
    {
        path: 'agents.list[].sandbox.docker.dns',
        label: 'Dns',
        type: 'array',
        description: 'Overrides standard resolver pipelines. Array sets explicit custom servers (e.g., `8.8.8.8`) mitigating internal host routing leakage.'
    },
    {
        path: 'agents.list[].sandbox.docker.extraHosts',
        label: 'Extra Hosts',
        type: 'object',
        description: 'A key-value map equating domain names to IP address blocks, effectively injecting custom mapping resolution akin to an `/etc/hosts` file modifier.'
    },
    {
        path: 'agents.list[].sandbox.docker.binds',
        label: 'Binds',
        type: 'array',
        description: 'Maps internal `/guest/paths` specifically to external `/host/paths`. Only essential for intricate volume sharing scenarios outside typical Workspace boundaries.'
    },
    {
        path: 'agents.list[].sandbox.browser',
        label: 'Browser',
        type: 'object',
        description: 'If the agent requires web navigation or UI testing, this manages the Playwright/Puppeteer Chromium instance mapping and its respective hardware isolated architecture.'
    },
    {
        path: 'agents.list[].sandbox.browser.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the existence of the browser interface. Crucial to leave off unless absolutely required due to the immense RAM overhead Chromium instantiates.'
    },
    {
        path: 'agents.list[].sandbox.browser.image',
        label: 'Image',
        type: 'string',
        description: 'OCI Registry tag for the browser image environment. Custom UI testing frameworks heavily rely on specific Playwright-branded base images.'
    },
    {
        path: 'agents.list[].sandbox.browser.containerPrefix',
        label: 'Container Prefix',
        type: 'string',
        description: 'Specific string identifier allowing container managers to group headless node processes directly belonging to the active UI tester.'
    },
    {
        path: 'agents.list[].sandbox.browser.cdpPort',
        label: 'Cdp Port',
        type: 'number',
        description: 'The TCP network port binding for the Chrome DevTools Protocol. Required for API manipulation (DOM clicks, script injection).'
    },
    {
        path: 'agents.list[].sandbox.browser.vncPort',
        label: 'Vnc Port',
        type: 'number',
        description: 'TCP networking hole for VNC streaming protocols, permitting admins to physically watch the headless agent navigate complex interactions.'
    },
    {
        path: 'agents.list[].sandbox.browser.noVncPort',
        label: 'No Vnc Port',
        type: 'number',
        description: 'TCP networking binding for WebSockets-based frontend VNC interfaces, eliminating the need for standalone remote desktop client software.'
    },
    {
        path: 'agents.list[].sandbox.browser.headless',
        label: 'Headless',
        type: 'boolean',
        description: 'Forces the browser to render via a fake framebuffer without allocating a dedicated X11 display interface.'
    },
    {
        path: 'agents.list[].sandbox.browser.enableNoVnc',
        label: 'Enable No Vnc',
        type: 'boolean',
        description: 'If `true`, provisions the internal proxy binaries to compile Novnc packet translations natively.'
    },
    {
        path: 'agents.list[].sandbox.browser.allowHostControl',
        label: 'Allow Host Control',
        type: 'boolean',
        description: 'Critical boolean establishing if human users logging into the system can take control of the agent\'s mouse and keyboard interfaces remotely.'
    },
    {
        path: 'agents.list[].sandbox.browser.autoStart',
        label: 'Auto Start',
        type: 'boolean',
        description: 'If true, provisions the Chromium VM container as soon as the Agent engine boots.'
    },
    {
        path: 'agents.list[].sandbox.browser.autoStartTimeoutMs',
        label: 'Auto Start Timeout Ms',
        type: 'number',
        description: 'Millisecond threshold defining exactly how long the system will wait for X Server to fully initialize before generating crash cascades.'
    },
    {
        path: 'agents.list[].sandbox.browser.binds',
        label: 'Binds',
        type: 'array',
        description: 'Specifically binds downloaded payloads or cache artifacts from internally run headless tests back across volume walls into host directories.'
    },
    {
        path: 'agents.list[].sandbox.prune',
        label: 'Prune',
        type: 'object',
        description: 'The background garbage collection mechanism that automatically stops hanging Docker containers or cleans orphaned vector fragments.'
    },
    {
        path: 'agents.list[].sandbox.prune.idleHours',
        label: 'Idle Hours',
        type: 'number',
        description: 'The number of hours of zero user activity preceding an automatic `docker kill` command designed to preserve hypervisor compute resources.'
    },
    {
        path: 'agents.list[].sandbox.prune.maxAgeDays',
        label: 'Max Age Days',
        type: 'number',
        description: 'Absolute time threshold regardless of activity status. Highly important for enforcing regular security updates and image repulls.'
    },
    {
        path: 'agents.list[].tools',
        label: 'Tools',
        type: 'object',
        description: 'The unified permissions boundary defining precisely what system functionalities (read file, execute terminal, fetch web) are accessible by the LLM reasoning loop.'
    },
    {
        path: 'agents.list[].tools.profile',
        label: 'Profile',
        type: 'string',
        description: 'Shorthand group policy configuration utilizing macros like `strict`, `development`, or `unrestricted` to automatically govern tool allowlists.'
    },
    {
        path: 'agents.list[].tools.allow',
        label: 'Allow',
        type: 'array',
        description: 'The declarative array of exactly which tool identities (e.g. `run_command`, `git_push`) exist on the whitelist.'
    },
    {
        path: 'agents.list[].tools.alsoAllow',
        label: 'Also Allow',
        type: 'array',
        description: 'Overrides standard `profile` rules by appending specific niche tools that might inherently conflict with blanket macro security policies.'
    },
    {
        path: 'agents.list[].tools.deny',
        label: 'Deny',
        type: 'array',
        description: 'Absolute blacklist override. Tools placed here will immediately yield synthetic rejection heuristics before ever hitting actual code interpreters.'
    },
    {
        path: 'agents.list[].tools.byProvider',
        label: 'By Provider',
        type: 'record',
        description: 'Extremely granular mapping allowing tool execution to be whitelisted mapped directly to explicit LLM API vendors.'
    },
    {
        path: 'agents.list[].tools.elevated',
        label: 'Elevated',
        type: 'object',
        description: 'Mechanism governing Sudo access matrices or system-level configuration APIs.'
    },
    {
        path: 'agents.list[].tools.elevated.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles administrative capability bypasses. Required for agent roles concerning underlying OS installation maintenance.'
    },
    {
        path: 'agents.list[].tools.elevated.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'Determines what originating scopes or authenticated usernames are legally permitted to ask the LLM to wield its elevated tools.'
    },
    {
        path: 'agents.list[].tools.exec',
        label: 'Exec',
        type: 'object',
        description: 'Tuning parameters for the all-powerful `run_command` API, establishing constraints for subshells and execution contexts.'
    },
    {
        path: 'agents.list[].tools.exec.host',
        label: 'Host',
        type: 'boolean',
        description: 'Extremely dangerous boolean enabling raw host OS logic execution that completely ignores Docker isolation layers.'
    },
    {
        path: 'agents.list[].tools.exec.security',
        label: 'Security',
        type: 'Enum: strict | standard | none',
        description: 'Macro parameter enforcing syntax verification. E.g., `strict` mode implicitly runs AST inspection blocks rejecting `rm -rf /` style shell payload anomalies.'
    },
    {
        path: 'agents.list[].tools.exec.ask',
        label: 'Ask',
        type: 'boolean',
        description: 'If `true`, execution attempts freeze entirely and emit a user-facing interactive prompt demanding manual "Approve" UI verification.'
    },
    {
        path: 'agents.list[].tools.exec.node',
        label: 'Node',
        type: 'boolean',
        description: 'Specifically provisions NodeJS API bridging permitting direct JavaScript eval trees inside host memory.'
    },
    {
        path: 'agents.list[].tools.exec.pathPrepend',
        label: 'Path Prepend',
        type: 'string',
        description: 'Overwrites standard `$PATH` bash variables to prioritize niche framework binaries (like `~/.cargo/bin`) ensuring compilation integrity.'
    },
    {
        path: 'agents.list[].tools.exec.safeBins',
        label: 'Safe Bins',
        type: 'array',
        description: 'If `security` evaluates to `strict`, ONLY commands derived from this exact string array (like `ls`, `grep`, `pwd`) are passed to the kernel.'
    },
    {
        path: 'agents.list[].tools.exec.backgroundMs',
        label: 'Background Ms',
        type: 'number',
        description: 'Millisecond timer deciding when a synchronous HTTP execution request transitions into an asynchronous background PID thread.'
    },
    {
        path: 'agents.list[].tools.exec.timeoutSec',
        label: 'Timeout Sec',
        type: 'number',
        description: 'Absolute termination clause. Kernel SIGKILL will be forcefully triggered if a command compilation loop extends mathematically beyond this number.'
    },
    {
        path: 'agents.list[].tools.exec.cleanupMs',
        label: 'Cleanup Ms',
        type: 'number',
        description: 'Timer specifying execution output cache pruning frequencies.'
    },
    {
        path: 'agents.list[].tools.exec.notifyOnExit',
        label: 'Notify On Exit',
        type: 'boolean',
        description: 'Toggles WS messaging informing end user chat instances that specific background `Make` or `Install` dependencies have logically completed execution.'
    },
    {
        path: 'agents.list[].tools.exec.notifyOnExitEmptySuccess',
        label: 'Notify On Exit Empty Success',
        type: 'boolean',
        description: 'Configures noisy system notifications. Suppresses broadcast alerts if the terminal process evaluates with `exit 0` but generates functionally zero stdout logs.'
    },
    {
        path: 'agents.list[].tools.exec.applyPatch',
        label: 'Apply Patch',
        type: 'object',
        description: 'Handles the extremely difficult multi-line inline editing logic via syntax diff application.'
    },
    {
        path: 'agents.list[].tools.exec.applyPatch.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles unified editing. If `false`, agents resort to naive "rewrite entire file" paradigms which frequently destroy memory tokens and API limits.'
    },
    {
        path: 'agents.list[].tools.exec.applyPatch.workspaceOnly',
        label: 'Workspace Only',
        type: 'boolean',
        description: 'Ensures inline patches are mathematically forbidden from reaching paths outside the active working repository, protecting system settings.'
    },
    {
        path: 'agents.list[].tools.exec.applyPatch.allowModels',
        label: 'Allow Models',
        type: 'array',
        description: 'Limits patch logic strictly to LLM architectures capable of advanced contextual diffs (typically `claude-3.5-sonnet` or similar tier models).'
    },
    {
        path: 'agents.list[].tools.exec.approvalRunningNoticeMs',
        label: 'Approval Running Notice Ms',
        type: 'number',
        description: 'Threshold trigger warning users "Execution still running, no approval required yet" via an ephemeral badge flag overlay.'
    },
    {
        path: 'agents.list[].tools.fs',
        label: 'Fs',
        type: 'object',
        description: 'Specific security wrapper pertaining to local Node execution bindings mapped to standard library `fs.readFile` and `fs.writeFile`.'
    },
    {
        path: 'agents.list[].tools.fs.workspaceOnly',
        label: 'Workspace Only',
        type: 'boolean',
        description: 'Identical conceptually to the docker logic lock: `fs.*` calls throw generic `EPERM` exceptions entirely on any reference crossing logical root hierarchies.'
    },
    {
        path: 'agents.list[].tools.sandbox',
        label: 'Sandbox',
        type: 'object',
        description: 'Sub-tool boundary strictly encapsulating utilities designated ONLY for safe execution explicitly inside ephemeral Docker topologies.'
    },
    {
        path: 'agents.list[].tools.sandbox.tools',
        label: 'Tools',
        type: 'object',
        description: 'List array logic mapping inside the Sandbox perimeter.'
    },
    {
        path: 'agents.list[].tools.sandbox.tools.allow',
        label: 'Allow',
        type: 'array',
        description: 'Array dictating what functionalities survive porting natively into the locked Docker container runtime wrapper module.'
    },
    {
        path: 'agents.list[].tools.sandbox.tools.alsoAllow',
        label: 'Also Allow',
        type: 'array',
        description: 'Appending override logic for secondary Docker macro scopes.'
    },
    {
        path: 'agents.list[].tools.sandbox.tools.deny',
        label: 'Deny',
        type: 'array',
        description: 'Blacklists functionalities. Even if technically operational inside Docker, denies execution via application-layer blocking matrices.'
    }
];

export default function AgentsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Agents Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Detailed configuration for AI agents, memory search, sandbox environments, and execution hooks. This module defines the cognitive boundaries and physical limits of every AI profile within the PowerDirector ecosystem.</p>
            </div>
            <div className="space-y-6">
                {AGENT_CONFIGS.map((config) => (
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
