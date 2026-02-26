// AUTOMATICALLY GENERATED Documentation Component for session
import React from 'react';

const SESSION_CONFIGS = [
    {
        path: 'session.scope',
        label: 'Scope',
        type: 'Enum: user | thread | channel',
        description: 'The mathematical boundaries defining exactly what the LLM considers a single "conversation memory". `thread` forces the AI to only remember messages strictly chained inside a Slack reply thread, whereas `channel` allows it to read history from the entire Discord room regardless of replies.'
    },
    {
        path: 'session.dmScope',
        label: 'Dm Scope',
        type: 'Enum: user | thread | channel',
        description: 'Specific override matrix applied exclusively when a user Direct Messages the Agent natively bridging the 1-on-1 interface.'
    },
    {
        path: 'session.identityLinks',
        label: 'Identity Links',
        type: 'boolean',
        description: 'If `true`, the Agent bridges its memory across entirely different platforms based on email hashes. If Alice talks to the bot on MS Teams, and then texts the bot on SMS, the agent inherently knows it\'s the same "Alice" and remembers the Teams conversation.'
    },
    {
        path: 'session.resetTriggers',
        label: 'Reset Triggers',
        type: 'array',
        description: 'String or Regex phrases (e.g. `["forget everything", "reset chat", "/clear"]`) that, when explicitly spoken by a user, instantly wipe the active LLM memory context buffer tied to that session ID.'
    },
    {
        path: 'session.idleMinutes',
        label: 'Idle Minutes',
        type: 'number',
        description: 'Global threshold. If a specific conversation thread sits silently for this many minutes, the server autonomously wipes the memory buffer to conserve volatile Database space.'
    },
    {
        path: 'session.reset',
        label: 'Reset',
        type: 'object',
        description: 'Background cron job definitions handling autonomous memory pruning.'
    },
    {
        path: 'session.reset.mode',
        label: 'Mode',
        type: 'Enum: idle | daily | never',
        description: 'Determines the garbage collection trigger algorithm.'
    },
    {
        path: 'session.reset.atHour',
        label: 'At Hour',
        type: 'number',
        description: 'If `mode` is daily, specifies the UTC hour (0-23) when the mass memory wipe executes globally.'
    },
    {
        path: 'session.reset.idleMinutes',
        label: 'Idle Minutes',
        type: 'number',
        description: 'Duration fallback mapped specifically for `idle` mode triggers.'
    },
    {
        path: 'session.resetByType',
        label: 'Reset By Type',
        type: 'object',
        description: 'Fine-grained override routing allowing different memory retention rules based on exactly where the chat is occurring.'
    },
    {
        path: 'session.resetByType.direct',
        label: 'Direct',
        type: 'object',
        description: 'Memory rules for CLI/Terminal or direct API headless connections.'
    },
    {
        path: 'session.resetByType.direct.mode',
        label: 'Mode',
        type: 'string',
        description: 'Retention strategy (idle/daily) for CLI agents.'
    },
    {
        path: 'session.resetByType.dm',
        label: 'Dm',
        type: 'object',
        description: 'Memory rules for 1-on-1 chat platforms like SMS or Slack Direct Messages.'
    },
    {
        path: 'session.resetByType.group',
        label: 'Group',
        type: 'object',
        description: 'Memory rules for main public channels where data accrues violently fast.'
    },
    {
        path: 'session.resetByType.thread',
        label: 'Thread',
        type: 'object',
        description: 'Memory rules exclusively for nested conversational threads.'
    },
    {
        path: 'session.resetByChannel',
        label: 'Reset By Channel',
        type: 'record',
        description: 'Ultimate override block allowing system admins to hardcode specific UUIDs (e.g. `slack_dev_channel`) to never flush memory, overriding all global or type-based logic hierarchies.'
    },
    {
        path: 'session.store',
        label: 'Store',
        type: 'Enum: sqlite | postgres | memory',
        description: 'Architectural database target where PowerDirector persists the active conversational sliding window context arrays before handing them off to OpenAI/Anthropic.'
    },
    {
        path: 'session.typingIntervalSeconds',
        label: 'Typing Interval Seconds',
        type: 'number',
        description: 'How frequently the Gateway broadcasts HTTP/WebSocket `typing...` packets to UI clients while waiting for a massive multi-minute LLM code generation to finalize.'
    },
    {
        path: 'session.typingMode',
        label: 'Typing Mode',
        type: 'Enum: auto | never | always',
        description: 'Controls whether the Agent attempts to mimic human typing delays.'
    },
    {
        path: 'session.mainKey',
        label: 'Main Key',
        type: 'string',
        description: 'The internal logical namespace index partitioning the SQLite/Postgres schemas.'
    },
    {
        path: 'session.sendPolicy',
        label: 'Send Policy',
        type: 'object',
        description: 'Security rules dictating exactly which user accounts are physically permitted to initiate new sessions with the Agent.'
    },
    {
        path: 'session.sendPolicy.default',
        label: 'Default',
        type: 'Enum: allow | deny',
        description: 'Master gate toggle.'
    },
    {
        path: 'session.sendPolicy.rules',
        label: 'Rules',
        type: 'array',
        description: 'Sequential fallback arrays generating custom allow/deny whitelists against specific user IDs or Slack channels.'
    },
    {
        path: 'session.agentToAgent',
        label: 'Agent To Agent',
        type: 'object',
        description: 'Heuristics to prevent uncontrolled recursive loops when two distinct Agents begin answering each other.'
    },
    {
        path: 'session.agentToAgent.maxPingPongTurns',
        label: 'Max Ping Pong Turns',
        type: 'number',
        description: 'Hard limit. If two agents bounce a conversation back and forth this many times without human intervention, the Session engine aggressively cuts the feed and forces them both to sleep.'
    },
    {
        path: 'session.maintenance',
        label: 'Maintenance',
        type: 'object',
        description: 'Background vacuuming protocols preventing SQLite WAL or memory databases from hitting 50GB caps.'
    },
    {
        path: 'session.maintenance.mode',
        label: 'Mode',
        type: 'string',
        description: 'Standard cron string mapping.'
    },
    {
        path: 'session.maintenance.pruneAfter',
        label: 'Prune After',
        type: 'boolean',
        description: 'Enable autonomous database `.vacuum()` executions.'
    },
    {
        path: 'session.maintenance.pruneDays',
        label: 'Prune Days',
        type: 'number',
        description: 'Truncates and deletes rows entirely older than this threshold.'
    },
    {
        path: 'session.maintenance.maxEntries',
        label: 'Max Entries',
        type: 'number',
        description: 'Row-count cap threshold triggering an emergency truncation regardless of timestamps.'
    },
    {
        path: 'session.maintenance.rotateBytes',
        label: 'Rotate Bytes',
        type: 'number',
        description: 'File-size cap threshold forcing SQLite swapping.'
    }
];

export default function SessionConfigDocs() {
    return (
        <div className="space-y-6 pb-24 max-w-[1200px]">
            <h1 className="text-4xl font-bold text-[var(--pd-text-main)]">LLM Context State Management Configuration</h1>
            <div className="prose prose-sm max-w-none border-b border-[var(--pd-border)] pb-8 mb-8">
                <p className="text-[var(--pd-text-main)] text-lg leading-relaxed opacity-90">Deep mechanics governing how PowerDirector stores and forgets conversational history across varying channels. These parameters handle memory pruning, infinite-loop prevention between multiple agents, and SQL scaling.</p>
            </div>
            <div className="space-y-6">
                {SESSION_CONFIGS.map((config) => (
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
