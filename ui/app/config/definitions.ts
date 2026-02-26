
// Section definitions grouped by category
export const SECTION_GROUPS = [
    {
        label: 'Core',
        sections: [
            { id: 'env', name: 'Environment', icon: '🌍' },
            { id: 'wizard', name: 'Setup Wizard', icon: '🧙' },
            { id: 'update', name: 'Updates', icon: '📦' },
            { id: 'auth', name: 'Authentication', icon: '🔐' },
            { id: 'agents', name: 'Agents', icon: '🤖' },
            { id: 'channels', name: 'Channels', icon: '📬' },
            { id: 'messages', name: 'Messages', icon: '💬' },
            { id: 'commands', name: 'Commands', icon: '⌨️' },
            { id: 'terminal', name: 'Terminal', icon: '🖥️' },
            { id: 'hooks', name: 'Hooks', icon: '🪝' },
            { id: 'skills', name: 'Skills', icon: '🎯' },
            { id: 'tools', name: 'Tools', icon: '🔧' },
        ]
    },
    {
        label: 'Infrastructure',
        sections: [
            { id: 'gateway', name: 'Gateway', icon: '🌐' },
            { id: 'meta', name: 'Meta', icon: '📋' },
            { id: 'diagnostics', name: 'Diagnostics', icon: '🔍' },
            { id: 'logging', name: 'Logging', icon: '📝' },
            { id: 'browser', name: 'Browser', icon: '🌏' },
            { id: 'ui', name: 'UI', icon: '🎨' },
            { id: 'models', name: 'Models', icon: '🧠' },
            { id: 'nodeHost', name: 'Node Host', icon: '🖥️' },
            { id: 'bindings', name: 'Bindings', icon: '🔗' },
            { id: 'broadcast', name: 'Broadcast', icon: '📡' },
            { id: 'audio', name: 'Audio', icon: '🔊' },
        ]
    },
    {
        label: 'Advanced',
        sections: [
            { id: 'media', name: 'Media', icon: '🖼️' },
            { id: 'approvals', name: 'Approvals', icon: '✅' },
            { id: 'session', name: 'Session', icon: '💾' },
            { id: 'cron', name: 'Cron Jobs', icon: '⏰' },
            { id: 'web', name: 'Web', icon: '🕸️' },
            { id: 'discovery', name: 'Discovery', icon: '🔎' },
            { id: 'canvasHost', name: 'Canvas Host', icon: '🎬' },
            { id: 'talk', name: 'Talk', icon: '🗣️' },
            { id: 'memory', name: 'Memory', icon: '🧩' },
            { id: 'plugins', name: 'Plugins', icon: '🔌' },
        ]
    }
];

export const SECTION_META: Record<string, { title: string; description: string }> = {
    env: { title: 'Environment', description: 'Shell environment and custom variables' },
    wizard: { title: 'Setup Wizard', description: 'First-run setup configuration' },
    update: { title: 'Updates', description: 'Update channels and auto-install behavior' },
    auth: { title: 'Authentication', description: 'Auth profiles, order, and cooldown settings' },
    agents: { title: 'Agents', description: 'Agent defaults, models, and concurrency' },
    channels: { title: 'Channels', description: 'Chat platform connections' },
    messages: { title: 'Messages', description: 'Message handling and formatting' },
    commands: { title: 'Commands', description: 'Command execution and custom prefixes' },
    terminal: { title: 'Terminal', description: 'Terminal shell selection and idle auto-timeout' },
    hooks: { title: 'Hooks', description: 'Internal event hooks and triggers' },
    skills: { title: 'Skills', description: 'Skill packages and installation' },
    tools: { title: 'Tools', description: 'Web search, fetch, and tool toggles' },
    gateway: { title: 'Gateway', description: 'Network gateway, ports, and auth' },
    meta: { title: 'Meta', description: 'Version and timestamp tracking' },
    diagnostics: { title: 'Diagnostics', description: 'Flags, cache tracing, and OpenTelemetry' },
    logging: { title: 'Logging', description: 'Log levels, console style, and redaction controls' },
    browser: { title: 'Browser', description: 'CDP URL, profiles, and browser execution controls' },
    ui: { title: 'UI', description: 'Theme, fonts, and display preferences' },
    models: { title: 'Models', description: 'AI model providers and configuration' },
    nodeHost: { title: 'Node Host', description: 'Node host browser proxy settings' },
    bindings: { title: 'Bindings', description: 'Channel-to-agent binding rules' },
    broadcast: { title: 'Broadcast', description: 'Broadcast strategy and peer mappings' },
    audio: { title: 'Audio', description: 'Legacy transcription compatibility settings' },
    media: { title: 'Media', description: 'Image generation and file handling' },
    approvals: { title: 'Approvals', description: 'Exec approval forwarding configuration' },
    session: { title: 'Session', description: 'Session scope, reset, maintenance, and send policy controls' },
    cron: { title: 'Cron Jobs', description: 'Scheduled tasks and automation' },
    web: { title: 'Web', description: 'Web runtime heartbeat and reconnect settings' },
    discovery: { title: 'Discovery', description: 'Service discovery and peer networking' },
    canvasHost: { title: 'Canvas Host', description: 'Visual canvas workspace settings' },
    talk: { title: 'Talk', description: 'Voice conversation mode' },
    memory: { title: 'Memory', description: 'Long-term memory and vector storage' },
    plugins: { title: 'Plugins', description: 'Plugin management and configuration' },
};
