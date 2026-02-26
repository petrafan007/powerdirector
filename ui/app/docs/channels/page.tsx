export default function ChannelsDocs() {
    return (
        <div className="space-y-6">
            <h1>Channels Connections</h1>
            <p className="lead">
                Channels are the bridge connecting your external platforms to your orchestration environment.
            </p>

            <h2>Understanding Channels</h2>
            <p>
                A Channel in PowerDirector represents a single, distinct communication pathway. Examples include a specific Discord server guild connection, a Slack bot integration, an active WebSocket for a website chat widget, or even the built-in PowerDirector Terminal.
            </p>

            <h3>How Channels Work</h3>
            <p>
                1. <strong>Input</strong>: Events, messages, and mentions from the external platform are received by the Channel connector.
                2. <strong>Routing</strong>: The Channel forwards the message payload to the Gateway.
                3. <strong>Binding</strong>: Based on configuration, the Gateway routes the payload to the bound Agent.
                4. <strong>Execution</strong>: The Agent processes the request, generates a response, and sends it back out through the Gateway to the Channel connector.
                5. <strong>Output</strong>: The Channel connector formats the agent's textual response back into platform-specific elements (e.g., Discord embeds) and delivers it to the end-user.
            </p>

            <h2>Supported Platforms</h2>
            <p>
                PowerDirector ships with built-in support for standard Channel types:
            </p>
            <ul>
                <li><strong>Terminal</strong>: The interactive, developer-focused REPL directly in this dashboard.</li>
                <li><strong>Discord Client</strong>: Connect your AI seamlessly to Discord servers as a verified bot application.</li>
                <li><strong>WebSocket</strong>: For generic, stateless real-time communication, often used in custom React frontends.</li>
            </ul>

            <h2>Security Configuration</h2>
            <p>
                Channels expose your powerful agents to the outside world. Please review Channel configuration carefully:
            </p>
            <ul>
                <li>Ensure API tokens for Discord/Slack are placed correctly in the `.env` file first.</li>
                <li>Use Agent-level system prompts to restrict what information an agent is allowed to disclose over public channels.</li>
                <li>Implement <strong>Approvals</strong> hooks if sensitive actions (like modifying a database) require human intervention before the agent can execute them.</li>
            </ul>
        </div>
    );
}
