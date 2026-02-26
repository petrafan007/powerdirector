// AUTOMATICALLY GENERATED Documentation Component for channels
import React from 'react';

const CHANNEL_CONFIGS = [
    // SLACK
    {
        path: 'channels.slack.webhookPath',
        label: 'Webhook Path',
        type: 'string',
        description: 'The explicit URL routing path (e.g., `/api/webhooks/slack`) where PowerDirector listens for incoming Event API JSON payloads from the Slack API platform. This must precisely match the Webhook URL registered in your Slack App developer console.'
    },
    {
        path: 'channels.slack.capabilities',
        label: 'Capabilities',
        type: 'array',
        description: 'A predefined array of strings declaring exactly what rich API functionalities this channel adapter supports. For Slack, this typically includes `markdown`, `threading`, `reactions`, and `file_upload`. Used internally by the Agent engine to downgrade formatting if a channel lacks support.'
    },
    {
        path: 'channels.slack.markdown',
        label: 'Markdown',
        type: 'object',
        description: 'Configuration for AST translation. Slack utilizes a proprietary markdown format (mrkdwn). This block controls how standard GitHub-flavored markdown from the LLM is converted into Slack-compatible blocks before transmission.'
    },
    {
        path: 'channels.slack.markdown.tables',
        label: 'Tables',
        type: 'boolean',
        description: 'Slack does not natively support rendering Markdown tables in standard message blocks. If `true`, the adapter intercepts table structures and attempts to render them using fixed-width code blocks to preserve visual alignment.'
    },
    {
        path: 'channels.slack.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle for the entire Slack integration. If `false`, the Slack WebSocket/HTTP listener shuts down completely, ceasing all ingress and egress communication with the Slack platform.'
    },
    {
        path: 'channels.slack.commands',
        label: 'Commands',
        type: 'object',
        description: 'Registers logical command bindings that users can directly type in Slack (like `/pd status`) to trigger hardcoded application macros without invoking the heavy LLM.'
    },
    {
        path: 'channels.slack.commands.native',
        label: 'Native',
        type: 'boolean',
        description: 'If `true`, users can execute system-level PowerDirector admin commands (like rebooting the gateway or viewing logs) securely from within a designated private Slack channel.'
    },
    {
        path: 'channels.slack.commands.nativeSkills',
        label: 'Native Skills',
        type: 'array',
        description: 'A whitelist of specific underlying Skills that bypass natural language and are immediately triggerable via strict slash commands for power users.'
    },
    {
        path: 'channels.slack.configWrites',
        label: 'Config Writes',
        type: 'boolean',
        description: 'Extremely sensitive toggle. If `true`, authenticated admin users in Slack can send commands that permanently edit the core PowerDirector configuration files.'
    },
    {
        path: 'channels.slack.botToken',
        label: 'Bot Token',
        type: 'string',
        description: 'The `xoxb-` prefixed OAuth credential mapping this server implementation to a specific Slack Bot User. Essential for posting messages and reading channel history.'
    },
    {
        path: 'channels.slack.appToken',
        label: 'App Token',
        type: 'string',
        description: 'The `xapp-` prefixed token required exclusively if PowerDirector is configured to use Slack Socket Mode rather than public external Webhooks. Bypasses corporate firewalls.'
    },
    {
        path: 'channels.slack.userToken',
        label: 'User Token',
        type: 'string',
        description: 'The `xoxp-` prefixed token. Highly dangerous, as it grants the PowerDirector bot the ability to masquerade impersonating a real human employee across all channels.'
    },
    {
        path: 'channels.slack.userTokenReadOnly',
        label: 'User Token Read Only',
        type: 'boolean',
        description: 'If a user token is provided, this strictly forces the token into a `read-only` context for ingestion only, explicitly denying the agent from sending messages as that human.'
    },
    {
        path: 'channels.slack.allowBots',
        label: 'Allow Bots',
        type: 'boolean',
        description: 'If `true`, the PowerDirector execution pipeline will process incoming messages sent by other Slack Bots (like CI/CD notifications or Jira) rather than solely humans.'
    },
    {
        path: 'channels.slack.requireMention',
        label: 'Require Mention',
        type: 'boolean',
        description: 'In public Slack channels, if `true`, the Agent will remain entirely dormant and ignore all conversation unless its specific `@BotName` is explicitly tagged.'
    },
    {
        path: 'channels.slack.groupPolicy',
        label: 'Group Policy',
        type: 'Enum: allow | block | restricted',
        description: 'Security baseline determining if the Bot is permitted to operate inside multi-user Slack Groups or Public Channels.'
    },
    {
        path: 'channels.slack.historyLimit',
        label: 'History Limit',
        type: 'number',
        description: 'The absolute maximum number of previous messages the adapter is allowed to fetch via the `conversations.history` API when pulling context for Public Channels.'
    },
    {
        path: 'channels.slack.dmHistoryLimit',
        label: 'DM History Limit',
        type: 'number',
        description: 'Overrides `historyLimit` specifically for 1-on-1 Direct Messages. Typically set higher than public channels as DMs require deeper conversational memory.'
    },
    {
        path: 'channels.slack.dms',
        label: 'Dms',
        type: 'array',
        description: 'An explicit allowlist of literal Slack User IDs that are permitted to initiate 1-on-1 private messages with the agent.'
    },
    {
        path: 'channels.slack.textChunkLimit',
        label: 'Text Chunk Limit',
        type: 'number',
        description: 'Slack enforces a hard ~3000 character limit on message blocks. This variable defines the substring cut-off point where PowerDirector automatically splits a single massive LLM response into sequential reply bubbles.'
    },
    {
        path: 'channels.slack.chunkMode',
        label: 'Chunk Mode',
        type: 'Enum: sentence | paragraph | block',
        description: 'Determines the algorithm used to slice messages that exceed the text chunk limit. `paragraph` ensures clean splits at double line breaks, whereas `sentence` is aggressively tighter.'
    },
    {
        path: 'channels.slack.blockStreaming',
        label: 'Block Streaming',
        type: 'boolean',
        description: 'If `true`, PowerDirector utilizes advanced Slack Block Kit mutations to simulate real-time typing, updating the same message block in-place as the LLM streams tokens.'
    },
    {
        path: 'channels.slack.blockStreamingCoalesce',
        label: 'Block Streaming Coalesce',
        type: 'object',
        description: 'Because updating a Slack API block for every single 3-character token would instantly trigger Rate Limit bans, this object defines the pooling math to batch visual UI updates.'
    },
    {
        path: 'channels.slack.blockStreamingCoalesce.minChars',
        label: 'Min Chars',
        type: 'number',
        description: 'The minimum number of newly generated text characters that must accumulate before the adapter submits a network request to update the live Slack message.'
    },
    {
        path: 'channels.slack.blockStreamingCoalesce.maxChars',
        label: 'Max Chars',
        type: 'number',
        description: 'A forced flush trigger. If this many characters assemble, the adapter instantly pushes the UI update regardless of any other timer settings.'
    },
    {
        path: 'channels.slack.blockStreamingCoalesce.idleMs',
        label: 'Idle Ms',
        type: 'number',
        description: 'If the LLM drastically slows down (e.g. thinking deeply), this millisecond timer acts as a deadline to push whatever characters are currently pooled, ensuring the UI does not look frozen.'
    },
    {
        path: 'channels.slack.mediaMaxMb',
        label: 'Media Max Mb',
        type: 'number',
        description: 'The maximum allowed filesize (in Megabytes) for image or PDF attachments uploaded to the Slack bot before the adapter rejects them to save memory buffering limits.'
    },
    {
        path: 'channels.slack.reactionNotifications',
        label: 'Reaction Notifications',
        type: 'boolean',
        description: 'If `true`, the bot listens for people placing emoji reactions on its past messages, allowing it to treat the reaction as a silent behavioral feedback trigger or command.'
    },
    {
        path: 'channels.slack.reactionAllowlist',
        label: 'Reaction Allowlist',
        type: 'array',
        description: 'A dedicated array of specific emoji aliases (e.g., `+1`, `eyes`, `x`) that the bot will actually acknowledge. Reactions not on this list are totally ignored to prevent spam.'
    },
    {
        path: 'channels.slack.replyToMode',
        label: 'Reply To Mode',
        type: 'Enum: thread | channel',
        description: 'The global baseline defining if the bot creates explicit child Thread replies to the invoking user\'s message, or posts standalone messages in the main Channel root.'
    },
    {
        path: 'channels.slack.replyToModeByChatType',
        label: 'Reply To Mode By Chat Type',
        type: 'object',
        description: 'Granular conditional overrides for the reply structural layout depending on the context topology of the conversation.'
    },
    {
        path: 'channels.slack.replyToModeByChatType.direct',
        label: 'Direct',
        type: 'string',
        description: 'Typically set to `channel` within DMs because threading 1-on-1 conversations is visually redundant and ruins mobile UX.'
    },
    {
        path: 'channels.slack.replyToModeByChatType.group',
        label: 'Group',
        type: 'string',
        description: 'Typically set to `thread` to ensure the bot does not monopolize all screen real estate in heavily active public channels.'
    },
    {
        path: 'channels.slack.replyToModeByChatType.channel',
        label: 'Channel',
        type: 'string',
        description: 'Behavioral layout routing for entirely unstructured global chat zones.'
    },
    {
        path: 'channels.slack.thread',
        label: 'Thread',
        type: 'object',
        description: 'Complex math definitions regarding how conversational history is assembled when an LLM is reading deep within a nested Slack thread.'
    },
    {
        path: 'channels.slack.thread.historyScope',
        label: 'History Scope',
        type: 'Enum: strict | hybrid | flat',
        description: '`strict` only reads messages inside the active thread. `hybrid` injects the preceding 5 root channel messages for context before evaluating the thread.'
    },
    {
        path: 'channels.slack.thread.inheritParent',
        label: 'Inherit Parent',
        type: 'boolean',
        description: 'If `true`, the bot inherently prepends the original parent message that spawned the thread to the top of its context window so it remembers exactly what is being discussed.'
    },
    {
        path: 'channels.slack.thread.initialHistoryLimit',
        label: 'Initial History Limit',
        type: 'number',
        description: 'The precise amount of context lines grabbed upon immediately initializing the memory profile for a brand new thread.'
    },
    {
        path: 'channels.slack.actions',
        label: 'Actions',
        type: 'object',
        description: 'Toggles for advanced Slack interactive GUI manipulation, moving past basic text routing into native API capabilities.'
    },
    {
        path: 'channels.slack.actions.reactions',
        label: 'Reactions',
        type: 'boolean',
        description: 'Allows the Bot itself to post emoji reactions onto human messages (e.g. throwing a `check` mark to signify it started a long job).'
    },
    {
        path: 'channels.slack.actions.messages',
        label: 'Messages',
        type: 'boolean',
        description: 'Allows the Bot to systematically delete or edit its own previously broadcast messages if newer logic invalidates them.'
    },
    {
        path: 'channels.slack.actions.pins',
        label: 'Pins',
        type: 'boolean',
        description: 'Grants the Bot administrative clearance to natively Pin or Unpin important summaries to the Slack channel header.'
    },
    {
        path: 'channels.slack.actions.search',
        label: 'Search',
        type: 'boolean',
        description: 'Authorizes the adapter to utilize the `search.messages` API, enabling the agent to autonomously query the entire corporate Slack history.'
    },
    {
        path: 'channels.slack.actions.permissions',
        label: 'Permissions',
        type: 'boolean',
        description: 'Dangerous flag. Permits the bot to invite or kick personnel from designated private channels during automated incident management protocols.'
    },
    {
        path: 'channels.slack.actions.memberInfo',
        label: 'Member Info',
        type: 'boolean',
        description: 'Permits the agent to hit the `users.info` API to lookup the real name, email, and timezone of a user ID before generating a targeted response.'
    },
    {
        path: 'channels.slack.actions.channelInfo',
        label: 'Channel Info',
        type: 'boolean',
        description: 'Permits hitting `conversations.info` to allow the bot to read the topic/description of a channel, often used to inject implicit system prompts based on room purpose.'
    },
    {
        path: 'channels.slack.actions.emojiList',
        label: 'Emoji List',
        type: 'boolean',
        description: 'Grants the agent the ability to scrape the custom workspace emoji catalog to utilize specialized corporate emotes in its output.'
    },
    {
        path: 'channels.slack.slashCommand',
        label: 'Slash Command',
        type: 'object',
        description: 'Routing rules defining how standard CLI-style Slack `/commands` interface with the PowerDirector pipeline.'
    },
    {
        path: 'channels.slack.slashCommand.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the Webhook interpreter for Slash payload ingestion.'
    },
    {
        path: 'channels.slack.slashCommand.name',
        label: 'Name',
        type: 'string',
        description: 'The literal string registered in the Slack Developer Console (e.g. `/pd`) that routes to this specific adapter.'
    },
    {
        path: 'channels.slack.slashCommand.sessionPrefix',
        label: 'Session Prefix',
        type: 'string',
        description: 'Appends a namespace string to the internal Agent database session ensuring state cleanly separates standard chats from heavy slash-driven batch commands.'
    },
    {
        path: 'channels.slack.slashCommand.ephemeral',
        label: 'Ephemeral',
        type: 'boolean',
        description: 'If `true`, responses generated from a slash command are rendered as "Only visible to you" whispers in the Slack UI rather than spamming the channel.'
    },
    {
        path: 'channels.slack.dmPolicy',
        label: 'Dm Policy',
        type: 'string',
        description: 'Global fallback rule (`allow`, `deny`, `admin_only`) determining if unrecognized users can open entirely new DM scopes with the engine.'
    },
    {
        path: 'channels.slack.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'A strict list of specific Slack User IDs. The adapter forcefully drops all incoming payloads originating from any UUID not present in this root whitelist.'
    },
    {
        path: 'channels.slack.dm',
        label: 'Dm',
        type: 'object',
        description: 'Additional legacy or specialized configurations targeting 1-on-1 private messaging behavior.'
    },
    {
        path: 'channels.slack.dm.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggle for permitting Direct Messaging.'
    },
    {
        path: 'channels.slack.dm.policy',
        label: 'Policy',
        type: 'string',
        description: 'Granular conditional allowance.'
    },
    {
        path: 'channels.slack.dm.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'Explicit list of IDs capable of DMing.'
    },
    {
        path: 'channels.slack.dm.groupEnabled',
        label: 'Group Enabled',
        type: 'boolean',
        description: 'Permits the bot to execute within Multi-Party Direct Messages (MPDMs) containing up to 9 users without occupying a formal Channel.'
    },
    {
        path: 'channels.slack.dm.groupChannels',
        label: 'Group Channels',
        type: 'array',
        description: 'A static whitelist of specific predefined MPDM group IDs.'
    },
    {
        path: 'channels.slack.dm.replyToMode',
        label: 'Reply To Mode',
        type: 'string',
        description: 'Formatting logic for DM namespaces.'
    },
    {
        path: 'channels.slack.channels',
        label: 'Channels',
        type: 'array',
        description: 'An explicit allowlist of public or private Channel IDs (e.g., `C1234567`) the bot is legally allowed to operate within. Messages outside these exact channels are structurally dropped.'
    },
    {
        path: 'channels.slack.heartbeat',
        label: 'Heartbeat',
        type: 'object',
        description: 'Controls how autonomous background operations broadcast visual pulses or notifications to this platform.'
    },
    {
        path: 'channels.slack.heartbeat.showOk',
        label: 'Show Ok',
        type: 'boolean',
        description: 'If `false`, successfully passed background scanning jobs are hidden to prevent noise, only emitting messages upon failure anomalies.'
    },
    {
        path: 'channels.slack.heartbeat.showAlerts',
        label: 'Show Alerts',
        type: 'boolean',
        description: 'Allows critical exception traces generated during background scans to explicitly ping `@here` in the output Slack room.'
    },
    {
        path: 'channels.slack.heartbeat.useIndicator',
        label: 'Use Indicator',
        type: 'boolean',
        description: 'Forces the Slack Bot to display a pseudo "typing..." animation indefinitely while the heartbeat script executes.'
    },
    {
        path: 'channels.slack.responsePrefix',
        label: 'Response Prefix',
        type: 'string',
        description: 'A static Markdown block automatically prepended to every single message outputted. Often used to prepend an AI warning disclaimer like `[Generated by PowerDirector]`.'
    },
    {
        path: 'channels.slack.ackReaction',
        label: 'Ack Reaction',
        type: 'string',
        description: 'Specific emoji string (e.g. `eyes` or `gear`) that the bot will instantly drop onto a human message within milliseconds to confirm receipt before enduring the 5-second LLM delay.'
    },
    {
        path: 'channels.slack.accounts',
        label: 'Accounts',
        type: 'array',
        description: 'Support for multiplexing multiple distinct Slack App identities through the same PowerDirector gateway.'
    },

    // SIGNAL
    {
        path: 'channels.signal.name',
        label: 'Name',
        type: 'string',
        description: 'Visual display identifier used for internal router tracking when distinguishing between multiple connected privacy-focused messaging silos.'
    },
    {
        path: 'channels.signal.capabilities',
        label: 'Capabilities',
        type: 'array',
        description: 'An internal strict interface array declaring the minimal media constraints Signal supports (usually just `text` and basic `image`).'
    },
    {
        path: 'channels.signal.markdown',
        label: 'Markdown',
        type: 'object',
        description: 'Since standard Signal protocols support incredibly rudimentary text formatting relative to Slack, this configuration aggressively strips or translates complex LLM markdown into plain ASCII structures.'
    },
    {
        path: 'channels.signal.markdown.tables',
        label: 'Tables',
        type: 'boolean',
        description: 'Toggles a defensive fallback that flattens Markdown tables into linearized list text, as Signal apps cannot render table views.'
    },
    {
        path: 'channels.signal.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master binary switch to activate or completely sever the Signal CLI daemon bridge.'
    },
    {
        path: 'channels.signal.configWrites',
        label: 'Config Writes',
        type: 'boolean',
        description: 'Admin override permitting incoming Signal text messages encoded natively to modify server configuration files.'
    },
    {
        path: 'channels.signal.account',
        label: 'Account',
        type: 'string',
        description: 'The exact registered Phone Number (formatted universally like `+15551234567`) that the background signal-cli daemon is pinned to.'
    },
    {
        path: 'channels.signal.httpUrl',
        label: 'Http Url',
        type: 'string',
        description: 'Path pointing to the local REST API reverse-proxy adapter acting as the bridge between PowerDirector and the underlying CLI binary.'
    },
    {
        path: 'channels.signal.httpHost',
        label: 'Http Host',
        type: 'string',
        description: 'The internal Unix bind host (usually `127.0.0.1` or `0.0.0.0`) for the Java-based Daemon.'
    },
    {
        path: 'channels.signal.httpPort',
        label: 'Http Port',
        type: 'number',
        description: 'TCP networking port binding the proxy.'
    },
    {
        path: 'channels.signal.cliPath',
        label: 'Cli Path',
        type: 'string',
        description: 'Absolute Linux filesystem path pointing explicitly to the `signal-cli` Java binary executable used to encrypt/decrypt payloads natively.'
    },
    {
        path: 'channels.signal.autoStart',
        label: 'Auto Start',
        type: 'boolean',
        description: 'Determines whether PowerDirector is responsible for actively spawning and killing the Java daemon subprocess upon server boot, or if it runs unmanaged via systemd.'
    },
    {
        path: 'channels.signal.startupTimeoutMs',
        label: 'Startup Timeout Ms',
        type: 'number',
        description: 'Wait timer dedicated to the immensely slow Java JVM spin-up process required by Signal before accepting Webhook ingress loops.'
    },
    {
        path: 'channels.signal.receiveMode',
        label: 'Receive Mode',
        type: 'Enum: websocket | http',
        description: 'Determines the ingestion schema. WebSockets provide vastly superior bidirectional latency over polling HTTP queues for end-to-end encryption frameworks.'
    },
    {
        path: 'channels.signal.ignoreAttachments',
        label: 'Ignore Attachments',
        type: 'boolean',
        description: 'Due to severe network constraints, this strictly forces the agent to drop all incoming images or audio files sent on Signal rather than attempting heavy OCR/ASR.'
    },
    {
        path: 'channels.signal.ignoreStories',
        label: 'Ignore Stories',
        type: 'boolean',
        description: 'Suppresses execution hits caused by broadcasting or viewing 24-hour disappearing statuses within the Signal app.'
    },
    {
        path: 'channels.signal.sendReadReceipts',
        label: 'Send Read Receipts',
        type: 'boolean',
        description: 'Determines if the Agent will transmit protocol-level `read` pings back to the sender the moment the gateway buffers the message into memory.'
    },
    {
        path: 'channels.signal.dmPolicy',
        label: 'Dm Policy',
        type: 'string',
        description: 'Global fallback rules defining interaction matrix boundaries for unrecognized phone numbers.'
    },
    {
        path: 'channels.signal.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'Absolute whitelist of `+1` E.164 formatted phone numbers permitted to ping the LLM. Messages from unknown numbers are dropped at the packet border.'
    },
    {
        path: 'channels.signal.groupAllowFrom',
        label: 'Group Allow From',
        type: 'array',
        description: 'An array of specific cryptographic Group IDs that the bot is allowed to interact with.'
    },
    {
        path: 'channels.signal.groupPolicy',
        label: 'Group Policy',
        type: 'string',
        description: 'Strict baseline permissions managing how the bot behaves if suddenly added to a large multi-user Signal chat.'
    },
    {
        path: 'channels.signal.historyLimit',
        label: 'History Limit',
        type: 'number',
        description: 'The rolling context window for retrieving past messages. Extremely critical here as Signal lacks true server-side history retention APIs.'
    },
    {
        path: 'channels.signal.dmHistoryLimit',
        label: 'Dm History Limit',
        type: 'number',
        description: 'Overrides history fetch limits tailored specifically for direct threaded lines.'
    },
    {
        path: 'channels.signal.dms',
        label: 'Dms',
        type: 'array',
        description: 'Secondary layer of authorized E.164 strings mapping to direct channels.'
    },
    {
        path: 'channels.signal.textChunkLimit',
        label: 'Text Chunk Limit',
        type: 'number',
        description: 'The maximum payload string limit for SMS-style applications before forcefully breaking the LLM response into sequential texts.'
    },
    {
        path: 'channels.signal.chunkMode',
        label: 'Chunk Mode',
        type: 'string',
        description: 'Algorithm dictating formatting cuts.'
    },
    {
        path: 'channels.signal.blockStreaming',
        label: 'Block Streaming',
        type: 'boolean',
        description: 'In Signal, "block streaming" relies on aggressively editing the identical message block rapidly via `replace` calls. Can be extremely taxing on mobile batteries.'
    },
    {
        path: 'channels.signal.blockStreamingCoalesce',
        label: 'Block Streaming Coalesce',
        type: 'object',
        description: 'Regulates how often the rapid update operations trigger against the target phone.'
    },
    {
        path: 'channels.signal.blockStreamingCoalesce.minChars',
        label: 'Min Chars',
        type: 'number',
        description: 'Character threshold required before pushing an update over the wire.'
    },
    {
        path: 'channels.signal.blockStreamingCoalesce.maxChars',
        label: 'Max Chars',
        type: 'number',
        description: 'Maximum permitted chunking block width.'
    },
    {
        path: 'channels.signal.blockStreamingCoalesce.idleMs',
        label: 'Idle Ms',
        type: 'number',
        description: 'Fallback timer forcing UI redraw on processing latency.'
    },
    {
        path: 'channels.signal.mediaMaxMb',
        label: 'Media Max Mb',
        type: 'number',
        description: 'Extremely vital hard cap on payload sizing. Signal actively struggles with massive multi-megabyte raw TIFFs or binary dumps sent by Agents.'
    },
    {
        path: 'channels.signal.reactionNotifications',
        label: 'Reaction Notifications',
        type: 'boolean',
        description: 'Enables interpreting standard mobile UI emoji reactions as actionable interaction events.'
    },
    {
        path: 'channels.signal.reactionAllowlist',
        label: 'Reaction Allowlist',
        type: 'array',
        description: 'Matrix defining which emoji scalars evaluate as true logic commands.'
    },
    {
        path: 'channels.signal.actions',
        label: 'Actions',
        type: 'object',
        description: 'Defines the capability set mapping for physical native mutations on the device.'
    },
    {
        path: 'channels.signal.actions.reactions',
        label: 'Reactions',
        type: 'boolean',
        description: 'Permits the daemon to deposit physical emoji overlays natively onto target messages.'
    },
    {
        path: 'channels.signal.reactionLevel',
        label: 'Reaction Level',
        type: 'string',
        description: 'Defines granularity for system feedback overrides on success profiles.'
    },
    {
        path: 'channels.signal.heartbeat',
        label: 'Heartbeat',
        type: 'object',
        description: 'Daemon pulse configurations pushing arbitrary scheduled texts through the encryption layer.'
    },
    {
        path: 'channels.signal.heartbeat.showOk',
        label: 'Show Ok',
        type: 'boolean',
        description: 'Toggle for emitting debug traces.'
    },
    {
        path: 'channels.signal.heartbeat.showAlerts',
        label: 'Show Alerts',
        type: 'boolean',
        description: 'Toggle for pushing error cascades to mobile.'
    },
    {
        path: 'channels.signal.heartbeat.useIndicator',
        label: 'Use Indicator',
        type: 'boolean',
        description: 'Mimics the "human typing" chat bubble on the targeted mobile device while computing.'
    },
    {
        path: 'channels.signal.responsePrefix',
        label: 'Response Prefix',
        type: 'string',
        description: 'Static disclaimer block prepended specifically to Signal texts.'
    },
    {
        path: 'channels.signal.accounts',
        label: 'Accounts',
        type: 'array',
        description: 'Enables the gateway to multiplex operations across multiple registered device nodes.'
    },

    // IMESSAGE
    {
        path: 'channels.imessage.name',
        label: 'Name',
        type: 'string',
        description: 'Visual reference mapping for the active iMessage protocol instance.'
    },
    {
        path: 'channels.imessage.capabilities',
        label: 'Capabilities',
        type: 'array',
        description: 'Declares what standard text logic passes safely through Apple\'s proprietary SMS gateway structure.'
    },
    {
        path: 'channels.imessage.markdown',
        label: 'Markdown',
        type: 'object',
        description: 'iMessage profoundly hates Markdown blocks. This matrix handles converting complex text UI layers into clean unicode character sets.'
    },
    {
        path: 'channels.imessage.markdown.tables',
        label: 'Tables',
        type: 'boolean',
        description: 'Defines table rasterization rules into simplified ASCII grids.'
    },
    {
        path: 'channels.imessage.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggle to activate the AppleOS SQLite intercept bridge.'
    },
    {
        path: 'channels.imessage.configWrites',
        label: 'Config Writes',
        type: 'boolean',
        description: 'Extremely dangerous boolean enabling iMessage payloads sent from your phone to permanently alter server core files.'
    },
    {
        path: 'channels.imessage.cliPath',
        label: 'Cli Path',
        type: 'string',
        description: 'The strict absolute execution location of standard `osascript` wrappers interfacing with the native messaging app.'
    },
    {
        path: 'channels.imessage.dbPath',
        label: 'Db Path',
        type: 'string',
        description: 'Absolute system directory pointing precisely to `~/Library/Messages/chat.db`. Required because this agent frequently operates by directly reading Apple\'s local SQLite history architecture.'
    },
    {
        path: 'channels.imessage.remoteHost',
        label: 'Remote Host',
        type: 'string',
        description: 'For topologies where the Node backend exists on a Linux server but bridges SSH calls to a physical Mac Mini acting as the text relay.'
    },
    {
        path: 'channels.imessage.service',
        label: 'Service',
        type: 'string',
        description: 'Mapping variable discerning fallback targets (iMessage Blue Bubbles vs SMS Green Bubbles).'
    },
    {
        path: 'channels.imessage.region',
        label: 'Region',
        type: 'string',
        description: 'International locale identifier assisting standard library phone number formatting parsers.'
    },
    {
        path: 'channels.imessage.dmPolicy',
        label: 'Dm Policy',
        type: 'string',
        description: 'Macro rule dictating inbound allowance.'
    },
    {
        path: 'channels.imessage.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'Mandatory array of trusted Apple IDs/Phone numbers permitted to execute the system.'
    },
    {
        path: 'channels.imessage.groupAllowFrom',
        label: 'Group Allow From',
        type: 'array',
        description: 'Declares which unified iMessage group chat UUIDs the bot may operate internally.'
    },
    {
        path: 'channels.imessage.groupPolicy',
        label: 'Group Policy',
        type: 'string',
        description: 'Determines reaction patterns within group settings.'
    },
    {
        path: 'channels.imessage.historyLimit',
        label: 'History Limit',
        type: 'number',
        description: 'The maximum count of rows pulled dynamically out of `chat.db` ensuring the bot maintains context.'
    },
    {
        path: 'channels.imessage.dmHistoryLimit',
        label: 'Dm History Limit',
        type: 'number',
        description: 'Targeted offset constraints explicitly for direct line threads.'
    },
    {
        path: 'channels.imessage.dms',
        label: 'Dms',
        type: 'array',
        description: 'Array outlining registered contact matrices.'
    },
    {
        path: 'channels.imessage.includeAttachments',
        label: 'Include Attachments',
        type: 'boolean',
        description: 'If `true`, the bot will read proprietary Apple attachment `.vcf` or `.caf` binary headers and proxy them to the LLM context module.'
    },
    {
        path: 'channels.imessage.mediaMaxMb',
        label: 'Media Max Mb',
        type: 'number',
        description: 'Threshold defining exactly when the parser rejects massive embedded system files sent via Apple infrastructure.'
    },
    {
        path: 'channels.imessage.textChunkLimit',
        label: 'Text Chunk Limit',
        type: 'number',
        description: 'Defines breaking points to prevent the target phone interface from violently scrolling under massive text payloads.'
    },
    {
        path: 'channels.imessage.chunkMode',
        label: 'Chunk Mode',
        type: 'string',
        description: 'Defines textual slicing strategy.'
    },
    {
        path: 'channels.imessage.blockStreaming',
        label: 'Block Streaming',
        type: 'boolean',
        description: 'Forces the system to systematically `Edit` the existing iMessage bubble for an interactive typewriter effect (requires iOS 16+).'
    },
    {
        path: 'channels.imessage.blockStreamingCoalesce',
        label: 'Block Streaming Coalesce',
        type: 'object',
        description: 'Buffers character injection avoiding immediate rate-limiter triggers.'
    },
    {
        path: 'channels.imessage.blockStreamingCoalesce.minChars',
        label: 'Min Chars',
        type: 'number',
        description: 'Paced minimum for payload aggregation.'
    },
    {
        path: 'channels.imessage.blockStreamingCoalesce.maxChars',
        label: 'Max Chars',
        type: 'number',
        description: 'Forced maximum for dumping payload matrices.'
    },
    {
        path: 'channels.imessage.blockStreamingCoalesce.idleMs',
        label: 'Idle Ms',
        type: 'number',
        description: 'Latency trigger forcing immediate GUI pushes.'
    },
    {
        path: 'channels.imessage.groups',
        label: 'Groups',
        type: 'array',
        description: 'Defines specific Group chat handles.'
    },
    {
        path: 'channels.imessage.heartbeat',
        label: 'Heartbeat',
        type: 'object',
        description: 'Execution logic for background polling loops routed into iMessage wrappers.'
    },
    {
        path: 'channels.imessage.heartbeat.showOk',
        label: 'Show Ok',
        type: 'boolean',
        description: 'Emits visual status blocks on clean passes.'
    },
    {
        path: 'channels.imessage.heartbeat.showAlerts',
        label: 'Show Alerts',
        type: 'boolean',
        description: 'Forces target system alerts via iOS notification banners on execution crash events.'
    },
    {
        path: 'channels.imessage.heartbeat.useIndicator',
        label: 'Use Indicator',
        type: 'boolean',
        description: 'Employs standard `osascript` logic to turn on the UI "Typing Bubble" explicitly.'
    },
    {
        path: 'channels.imessage.responsePrefix',
        label: 'Response Prefix',
        type: 'string',
        description: 'Configurable header text prefixed automatically inside every payload.'
    },
    {
        path: 'channels.imessage.accounts',
        label: 'Accounts',
        type: 'array',
        description: 'Multi-account handling.'
    },
    // BLUEBUBBLES
    {
        path: 'channels.bluebubbles.name',
        label: 'Name',
        type: 'string',
        description: 'Visual tracking identifier specifically for the BlueBubbles MacOS proxy bridge.'
    },
    {
        path: 'channels.bluebubbles.capabilities',
        label: 'Capabilities',
        type: 'array',
        description: 'Internal capabilities matrix defining what iMessage functions the external BlueBubbles HTTP server can physically trigger.'
    },
    {
        path: 'channels.bluebubbles.markdown',
        label: 'Markdown',
        type: 'object',
        description: 'Governs complex formatting transpilation towards the BlueBubbles API.'
    },
    {
        path: 'channels.bluebubbles.markdown.tables',
        label: 'Tables',
        type: 'boolean',
        description: 'Collapses markdown tables into linearized SMS text logic.'
    },
    {
        path: 'channels.bluebubbles.configWrites',
        label: 'Config Writes',
        type: 'boolean',
        description: 'Highly dangerous. Permits BlueBubbles SMS messages to trigger Linux host administration updates.'
    },
    {
        path: 'channels.bluebubbles.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggles the Webhook listener ensuring PowerDirector actively receives external SQLite reads from the BlueBubbles host.'
    },
    {
        path: 'channels.bluebubbles.serverUrl',
        label: 'Server Url',
        type: 'string',
        description: 'The physical remote FQDN or Ngrok tunneling address pointing to the physical MacOS device running the BlueBubbles Server.'
    },
    {
        path: 'channels.bluebubbles.password',
        label: 'Password',
        type: 'string',
        description: 'Secret authentication key matching the MacOS GUI application.'
    },
    {
        path: 'channels.bluebubbles.webhookPath',
        label: 'Webhook Path',
        type: 'string',
        description: 'The endpoint exposed explicitly on the PowerDirector gateway where the BlueBubbles sever sends `new_message` events.'
    },
    {
        path: 'channels.bluebubbles.dmPolicy',
        label: 'Dm Policy',
        type: 'string',
        description: 'Whitelist macro (e.g., `admin_only`) for unknown numbers texting the agent via iMessage.'
    },
    {
        path: 'channels.bluebubbles.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'Array of valid E.164 phone numbers mathematically granted conversational permissions.'
    },
    {
        path: 'channels.bluebubbles.groupAllowFrom',
        label: 'Group Allow From',
        type: 'array',
        description: 'Array of valid iMessage Chat IDs permitting the AI to observe and respond inside family/friend group chats.'
    },
    {
        path: 'channels.bluebubbles.groupPolicy',
        label: 'Group Policy',
        type: 'string',
        description: 'Reaction thresholds for unknown inbound group chat additions.'
    },
    {
        path: 'channels.bluebubbles.historyLimit',
        label: 'History Limit',
        type: 'number',
        description: 'Maximum database row retrieval via the REST API to establish ongoing conversational vectors.'
    },
    {
        path: 'channels.bluebubbles.dmHistoryLimit',
        label: 'Dm History Limit',
        type: 'number',
        description: 'Targeted offset constraints explicitly for direct line threads vs group chats.'
    },
    {
        path: 'channels.bluebubbles.dms',
        label: 'Dms',
        type: 'array',
        description: 'Specific direct contact mappings allowed.'
    },
    {
        path: 'channels.bluebubbles.textChunkLimit',
        label: 'Text Chunk Limit',
        type: 'number',
        description: 'BlueBubbles relies on Apple Push Notification matrices which sporadically drop immense walls of text. This limit forces precise chunk splicing.'
    },
    {
        path: 'channels.bluebubbles.chunkMode',
        label: 'Chunk Mode',
        type: 'string',
        description: 'Strategy delineating formatting split algorithms.'
    },
    {
        path: 'channels.bluebubbles.mediaMaxMb',
        label: 'Media Max Mb',
        type: 'number',
        description: 'Threshold dropping massively encoded video blocks sent from iPhones before parsing to save backend RAM limits.'
    },
    {
        path: 'channels.bluebubbles.mediaLocalRoots',
        label: 'Media Local Roots',
        type: 'array',
        description: 'If PowerDirector runs on the same exact Mac as BlueBubbles, this enables direct disk-fetching instead of heavy HTTP REST streaming.'
    },
    {
        path: 'channels.bluebubbles.sendReadReceipts',
        label: 'Send Read Receipts',
        type: 'boolean',
        description: 'Triggers the API to tell other users the Agent has "Read" their message upon ingestion.'
    },
    {
        path: 'channels.bluebubbles.blockStreaming',
        label: 'Block Streaming',
        type: 'boolean',
        description: 'Attempts iMessage Edit mutations to visually "stream" text into a pre-existing bubble in real-time.'
    },
    {
        path: 'channels.bluebubbles.blockStreamingCoalesce',
        label: 'Block Streaming Coalesce',
        type: 'object',
        description: 'Limits how aggressively the server pushes Edit payloads over REST.'
    },
    {
        path: 'channels.bluebubbles.blockStreamingCoalesce.minChars',
        label: 'Min Chars',
        type: 'number',
        description: 'Smallest update buffer block.'
    },
    {
        path: 'channels.bluebubbles.blockStreamingCoalesce.maxChars',
        label: 'Max Chars',
        type: 'number',
        description: 'Target trigger pushing the API regardless of wait times.'
    },
    {
        path: 'channels.bluebubbles.blockStreamingCoalesce.idleMs',
        label: 'Idle Ms',
        type: 'number',
        description: 'Forces update rendering if the LLM enters deep internal reasoning cycles.'
    },
    {
        path: 'channels.bluebubbles.groups',
        label: 'Groups',
        type: 'array',
        description: 'Registered Group IDs.'
    },
    {
        path: 'channels.bluebubbles.heartbeat',
        label: 'Heartbeat',
        type: 'object',
        description: 'Allows background automation to directly cold-text users.'
    },
    {
        path: 'channels.bluebubbles.heartbeat.showOk',
        label: 'Show Ok',
        type: 'boolean',
        description: 'Toggles output on successes.'
    },
    {
        path: 'channels.bluebubbles.heartbeat.showAlerts',
        label: 'Show Alerts',
        type: 'boolean',
        description: 'Toggles output on critical scanning failure.'
    },
    {
        path: 'channels.bluebubbles.heartbeat.useIndicator',
        label: 'Use Indicator',
        type: 'boolean',
        description: 'Visually shows the iMessage typing bubbles via API.'
    },
    {
        path: 'channels.bluebubbles.responsePrefix',
        label: 'Response Prefix',
        type: 'string',
        description: 'Literal text injected ahead of all LLM generations.'
    },
    {
        path: 'channels.bluebubbles.accounts',
        label: 'Accounts',
        type: 'array',
        description: 'Provides multiplex capabilities for running multiple independent iPhone numbers concurrently.'
    },
    {
        path: 'channels.bluebubbles.actions',
        label: 'Actions',
        type: 'object',
        description: 'Physical iMessage GUI overrides available through the REST API layer.'
    },
    {
        path: 'channels.bluebubbles.actions.reactions',
        label: 'Reactions',
        type: 'boolean',
        description: 'Can apply "Love", "Haha", "Like", Tapbacks natively on MacOS.'
    },
    {
        path: 'channels.bluebubbles.actions.edit',
        label: 'Edit',
        type: 'boolean',
        description: 'Can trigger the iOS16+ Edit functionality.'
    },
    {
        path: 'channels.bluebubbles.actions.unsend',
        label: 'Unsend',
        type: 'boolean',
        description: 'Permits deleting previously dispatched texts.'
    },
    {
        path: 'channels.bluebubbles.actions.reply',
        label: 'Reply',
        type: 'boolean',
        description: 'Can bind directly to a specific Message ID forming an internal Thread.'
    },
    {
        path: 'channels.bluebubbles.actions.sendWithEffect',
        label: 'Send With Effect',
        type: 'boolean',
        description: 'Grants the LLM power to use "Sent with Slam" or "Sent with Lasers".'
    },
    {
        path: 'channels.bluebubbles.actions.renameGroup',
        label: 'Rename Group',
        type: 'boolean',
        description: 'Can change the visual Title of family chats.'
    },
    {
        path: 'channels.bluebubbles.actions.setGroupIcon',
        label: 'Set Group Icon',
        type: 'boolean',
        description: 'Can upload AI generated art natively into the Group Avatar slot.'
    },
    {
        path: 'channels.bluebubbles.actions.addParticipant',
        label: 'Add Participant',
        type: 'boolean',
        description: 'Bot capability to invite external numbers to an existing discussion.'
    },
    {
        path: 'channels.bluebubbles.actions.removeParticipant',
        label: 'Remove Participant',
        type: 'boolean',
        description: 'Bot capability to kick members.'
    },
    {
        path: 'channels.bluebubbles.actions.leaveGroup',
        label: 'Leave Group',
        type: 'boolean',
        description: 'Allows the bot to autonomously ditch an active group payload thread.'
    },
    {
        path: 'channels.bluebubbles.actions.sendAttachment',
        label: 'Send Attachment',
        type: 'boolean',
        description: 'Permits rendering complex visual datasets via filesystem uploads into iMessage nodes.'
    },

    // MSTEAMS
    {
        path: 'channels.msteams.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle activating the Microsoft Bot Framework Listener inside PowerDirector.'
    },
    {
        path: 'channels.msteams.capabilities',
        label: 'Capabilities',
        type: 'array',
        description: 'Array denoting natively supported Teams GUI constructs (e.g. `adaptiveCards`, `threading`).'
    },
    {
        path: 'channels.msteams.markdown',
        label: 'Markdown',
        type: 'object',
        description: 'MS Teams utilizes a highly opinionated XML-style markup variant. This block intercepts standards.'
    },
    {
        path: 'channels.msteams.markdown.tables',
        label: 'Tables',
        type: 'boolean',
        description: 'If `true`, natively translates matrix logic into Microsoft Adaptive Card grid tables.'
    },
    {
        path: 'channels.msteams.configWrites',
        label: 'Config Writes',
        type: 'boolean',
        description: 'Allows Teams admins to adjust local Node server behaviors remotely.'
    },
    {
        path: 'channels.msteams.appId',
        label: 'App Id',
        type: 'string',
        description: 'The Application Client ID registered directly with Azure Active Directory / Entra ID for Bot Framework binding.'
    },
    {
        path: 'channels.msteams.appPassword',
        label: 'App Password',
        type: 'string',
        description: 'The Client Secret mapping to the overarching App ID generating OAuth2 exchange tokens.'
    },
    {
        path: 'channels.msteams.tenantId',
        label: 'Tenant Id',
        type: 'string',
        description: 'Limits the bot entirely to users residing explicitly within this strictly defined corporate Microsoft 365 Tenant.'
    },
    {
        path: 'channels.msteams.webhook',
        label: 'Webhook',
        type: 'object',
        description: 'Custom express.js routing overrides for the ingress port that receives Bot Framework REST pushes.'
    },
    {
        path: 'channels.msteams.webhook.port',
        label: 'Port',
        type: 'number',
        description: 'Overrides standard Gateway port bindings entirely for Enterprise compliance (e.g., forcing port `3978`).'
    },
    {
        path: 'channels.msteams.webhook.path',
        label: 'Path',
        type: 'string',
        description: 'Specifies the URL terminating point Teams reaches out to during messaging events.'
    },
    {
        path: 'channels.msteams.dmPolicy',
        label: 'Dm Policy',
        type: 'string',
        description: 'Governs interactions between organizational employees and the LLM via 1-on-1 Teams chats.'
    },
    {
        path: 'channels.msteams.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'Whitelist utilizing explicitly formatted Azure Active Directory `userPrincipalName` mappings (email addresses).'
    },
    {
        path: 'channels.msteams.groupAllowFrom',
        label: 'Group Allow From',
        type: 'array',
        description: 'Whitelist array permitting interaction specifically within defined Teams Rooms.'
    },
    {
        path: 'channels.msteams.groupPolicy',
        label: 'Group Policy',
        type: 'string',
        description: 'Default baseline if a room isn\'t explicitly present in `groupAllowFrom`.'
    },
    {
        path: 'channels.msteams.textChunkLimit',
        label: 'Text Chunk Limit',
        type: 'number',
        description: 'Hard MS API cap preventing immense visual overflows.'
    },
    {
        path: 'channels.msteams.chunkMode',
        label: 'Chunk Mode',
        type: 'string',
        description: 'Formatting slice instructions.'
    },
    {
        path: 'channels.msteams.blockStreamingCoalesce',
        label: 'Block Streaming Coalesce',
        type: 'object',
        description: 'Governs live payload Edit matrices against the Graph API limit structures.'
    },
    {
        path: 'channels.msteams.blockStreamingCoalesce.minChars',
        label: 'Min Chars',
        type: 'number',
        description: 'Wait pool.'
    },
    {
        path: 'channels.msteams.blockStreamingCoalesce.maxChars',
        label: 'Max Chars',
        type: 'number',
        description: 'Upload queue ceiling.'
    },
    {
        path: 'channels.msteams.blockStreamingCoalesce.idleMs',
        label: 'Idle Ms',
        type: 'number',
        description: 'Safety latency override.'
    },
    {
        path: 'channels.msteams.mediaAllowHosts',
        label: 'Media Allow Hosts',
        type: 'array',
        description: 'MS Teams routinely blocks rendering external images to prevent XSS. This whitelists valid corporate CDNs.'
    },
    {
        path: 'channels.msteams.mediaAuthAllowHosts',
        label: 'Media Auth Allow Hosts',
        type: 'array',
        description: 'Array denoting which specific external image hosts require OAuth traversal before downloading render assets.'
    },
    {
        path: 'channels.msteams.requireMention',
        label: 'Require Mention',
        type: 'boolean',
        description: 'Mandates the Agent strictly ignore everything inside corporate group chats unless explicitly tagged with `@AgentName`.'
    },
    {
        path: 'channels.msteams.historyLimit',
        label: 'History Limit',
        type: 'number',
        description: 'How far back into a Channel\'s thread history the bot processes via the Graph API.'
    },
    {
        path: 'channels.msteams.dmHistoryLimit',
        label: 'Dm History Limit',
        type: 'number',
        description: 'Direct Message thread history constraint bounds.'
    },
    {
        path: 'channels.msteams.dms',
        label: 'Dms',
        type: 'array',
        description: 'Allowed 1-on-1 AAD accounts.'
    },
    {
        path: 'channels.msteams.replyStyle',
        label: 'Reply Style',
        type: 'string',
        description: 'Normally dictates `thread` style replies inside massive corporate channels.'
    },
    {
        path: 'channels.msteams.teams',
        label: 'Teams',
        type: 'array',
        description: 'Hard-coded array dictating exact UUID bounds of the encompassing Office 365 Teams Groups.'
    },
    {
        path: 'channels.msteams.mediaMaxMb',
        label: 'Media Max Mb',
        type: 'number',
        description: 'Prevents Azure limits from rate-banning the Tenant when processing massive internal slide decks.'
    },
    {
        path: 'channels.msteams.sharePointSiteId',
        label: 'Share Point Site Id',
        type: 'string',
        description: 'Required logic mapping. Behind the scenes, Microsoft Teams utilizes SharePoint for all attachment storage. This binds the correct site path.'
    },
    {
        path: 'channels.msteams.heartbeat',
        label: 'Heartbeat',
        type: 'object',
        description: 'Background cron job scheduler for MS channel outputs.'
    },
    {
        path: 'channels.msteams.heartbeat.showOk',
        label: 'Show Ok',
        type: 'boolean',
        description: 'Permits the cron job to chat cleanly when succeeding.'
    },
    {
        path: 'channels.msteams.heartbeat.showAlerts',
        label: 'Show Alerts',
        type: 'boolean',
        description: 'Permits `@channel` pings when jobs fail entirely.'
    },
    {
        path: 'channels.msteams.heartbeat.useIndicator',
        label: 'Use Indicator',
        type: 'boolean',
        description: 'Shows typing API indicator to users.'
    },
    {
        path: 'channels.msteams.responsePrefix',
        label: 'Response Prefix',
        type: 'string',
        description: 'Required disclaimer text block injection.'
    },
    // TLON
    {
        path: 'channels.tlon.name',
        label: 'Name',
        type: 'string',
        description: 'Internal reference mapping for the Urbit/Tlon networking agent interface.'
    },
    {
        path: 'channels.tlon.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Master toggle allowing PowerDirector to interface with the decentralised Urbit pier network.'
    },
    {
        path: 'channels.tlon.ship',
        label: 'Ship',
        type: 'string',
        description: 'The exact registered `@p` format Urbit identity (e.g., `~sampel-palnet`) hosting the active agent.'
    },
    {
        path: 'channels.tlon.url',
        label: 'Url',
        type: 'string',
        description: 'Absolute URL pointing to the HTTP API proxy layer for the Urbit ship (e.g. `http://localhost:8080`).'
    },
    {
        path: 'channels.tlon.code',
        label: 'Code',
        type: 'string',
        description: 'The deeply sensitive `+code` secret passphrase required to authenticate API calls into the Tlon landscape.'
    },
    {
        path: 'channels.tlon.allowPrivateNetwork',
        label: 'Allow Private Network',
        type: 'boolean',
        description: 'Toggle authorizing the PowerDirector proxy to communicate across local Docker subnets to reach the host ship.'
    },
    {
        path: 'channels.tlon.groupChannels',
        label: 'Group Channels',
        type: 'array',
        description: 'Hardcoded list of active Tlon Group IDs where the bot is legally permitted to execute instructions.'
    },
    {
        path: 'channels.tlon.dmAllowlist',
        label: 'Dm Allowlist',
        type: 'array',
        description: 'Array of `@p` strings specifying which Urbit identities can ping this ship directly via DMs.'
    },
    {
        path: 'channels.tlon.autoDiscoverChannels',
        label: 'Auto Discover Channels',
        type: 'boolean',
        description: 'If `true`, the bot continuously monitors the `contact-store` to proactively index any new channels joined by the host Ship.'
    },
    {
        path: 'channels.tlon.showModelSignature',
        label: 'Show Model Signature',
        type: 'boolean',
        description: 'Injects a small ASCII signature (e.g., `[gpt-4o]`) at the footer of Urbit messages to indicate AI generation on a pseudonym-heavy network.'
    },
    {
        path: 'channels.tlon.dmPolicy',
        label: 'Dm Policy',
        type: 'string',
        description: 'Whitelist fallbacks for unverified inbound DMs.'
    },
    {
        path: 'channels.tlon.accounts',
        label: 'Accounts',
        type: 'array',
        description: 'Multiplex architecture allowing concurrent mapping of multiple unique Ships.'
    },

    // ZALO
    {
        path: 'channels.zalo.name',
        label: 'Name',
        type: 'string',
        description: 'Reference tag for the Vietnamese Zalo Official Account App integration.'
    },
    {
        path: 'channels.zalo.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggle to activate Zalo Official Account message ingestion pipelines.'
    },
    {
        path: 'channels.zalo.apiKey',
        label: 'Api Key',
        type: 'string',
        description: 'The Zalo Developer API token required for webhook registration and message sending.'
    },
    {
        path: 'channels.zalo.secretKey',
        label: 'Secret Key',
        type: 'string',
        description: 'Sensitive cryptographic key used specifically to decrypt Zalo event payloads validating their legitimate origin from Zalo Servers.'
    },
    {
        path: 'channels.zalo.oaId',
        label: 'Oa Id',
        type: 'string',
        description: 'The numeric Official Account ID mapping the agent to a specific branded public presence on the platform.'
    },
    {
        path: 'channels.zalo.phoneNumber',
        label: 'Phone Number',
        type: 'string',
        description: 'Fallback phone identity bound to the Official Account for administration purposes.'
    },
    {
        path: 'channels.zalo.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'List of numeric Zalo User IDs permitted to issue commands past the chatbot greeting.'
    },
    {
        path: 'channels.zalo.groupPolicy',
        label: 'Group Policy',
        type: 'string',
        description: 'Controls behavior routing for Official Accounts invited into group environments.'
    },
    {
        path: 'channels.zalo.botToken',
        label: 'Bot Token',
        type: 'string',
        description: 'Explicit granular scope token required for specific Zalo SDK endpoints beyond standard OA messaging.'
    },
    {
        path: 'channels.zalo.dmPolicy',
        label: 'Dm Policy',
        type: 'string',
        description: 'Fallback matrices mapping unknown Zalo users to generic FAQ flows vs LLM execution.'
    },
    {
        path: 'channels.zalo.accounts',
        label: 'Accounts',
        type: 'array',
        description: 'Multiplex tracking.'
    },

    // ZALOUSER
    {
        path: 'channels.zalouser.name',
        label: 'Name',
        type: 'string',
        description: 'Identifier for the unofficial Zalo User-Account proxy bridge.'
    },
    {
        path: 'channels.zalouser.enabled',
        label: 'Enabled',
        type: 'boolean',
        description: 'Toggle for the unofficial Puppeteer/Playwright Zalo Web headless scraper.'
    },
    {
        path: 'channels.zalouser.profile',
        label: 'Profile',
        type: 'string',
        description: 'The specific Chromium user-data-dir path containing the persisted `localStorage` auth cookies required to skip the Zalo QR Code.'
    },
    {
        path: 'channels.zalouser.dmPolicy',
        label: 'Dm Policy',
        type: 'string',
        description: 'Controls automated responses to unverified contacts scraping the headless web client.'
    },
    {
        path: 'channels.zalouser.allowFrom',
        label: 'Allow From',
        type: 'array',
        description: 'Exact whitelist of contact names passing through the web DOM.'
    },
    {
        path: 'channels.zalouser.groupPolicy',
        label: 'Group Policy',
        type: 'string',
        description: 'Determines reaction patterns for Zalo groups captured in the headless DOM.'
    },
    {
        path: 'channels.zalouser.groups',
        label: 'Groups',
        type: 'array',
        description: 'Static whitelist of allowed group identifiers for the unofficial user scraper.'
    },
    {
        path: 'channels.zalouser.accounts',
        label: 'Accounts',
        type: 'array',
        description: 'Multiplexer for tracking multiple concurrently headless Zalo sessions.'
    }
];

export default function ChannelsConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">Channel Gateways Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep-dive configuration arrays mapping specifically how the PowerDirector pipeline interfaces securely with proprietary third-party messaging systems like Slack, MS Teams, iMessage, and Signal.</p>
            </div>
            <div className="space-y-6">
                {CHANNEL_CONFIGS.map((config) => (
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
