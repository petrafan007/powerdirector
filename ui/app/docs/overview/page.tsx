export default function OverviewDocs() {
    return (
        <div className="space-y-6">
            <h1>Platform Overview</h1>
            <p className="lead">
                PowerDirector is an advanced orchestration platform designed to manage, monitor, and deploy AI agents across various channels and environments.
            </p>

            <h2>Architecture Overview</h2>
            <p>
                At its core, PowerDirector operates as a centralized hub connecting <strong>Agents</strong> (AI models equipped with specific instructions and tools) to <strong>Channels</strong> (communication mediums like web interfaces, Discord, Slack, etc.).
            </p>
            <p>
                The system relies on a unified event bus through the <strong>Gateway</strong> separating execution of tasks from network traffic, enabling robust scaling and integration via <strong>Nodes</strong>.
            </p>

            <h2>Key Concepts</h2>
            <ul>
                <li><strong>Agents</strong>: The "brains" configuration, dictating AI model choice, prompt injection, and available skills.</li>
                <li><strong>Channels</strong>: The I/O endpoints where users or systems interact with the AI.</li>
                <li><strong>Sessions</strong>: The context container holding conversation history, memory, and state data.</li>
                <li><strong>Instances</strong>: Running Docker/process containers encapsulating workloads.</li>
            </ul>

            <h2>Target Audience</h2>
            <p>
                This system is built for dual audiences:
            </p>
            <ol>
                <li><strong>Novice Users</strong>: Can utilize the seamless UI to connect pre-built agents to Discord or a basic web chat without writing code.</li>
                <li><strong>Expert Developers</strong>: Can write custom <em>Skills</em> in TypeScript, construct custom <em>Hooks</em> for complex automation, and manipulate the <em>Gateway</em> directly.</li>
            </ol>

            <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg mt-8">
                <h4 className="text-blue-400 m-0 mb-2">Pro Tip</h4>
                <p className="m-0 text-sm">
                    If you are new to PowerDirector, start by visiting the <strong>Agents</strong> tab, configuring an AI model, and using the built-in <strong>Terminal</strong> channel to chat immediately.
                </p>
            </div>
        </div>
    );
}
