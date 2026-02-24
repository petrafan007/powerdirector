export default function AgentsDocs() {
    return (
        <div className="space-y-6">
            <h1>Agents Management</h1>
            <p className="lead">
                The Agents interface is the core control center for configuring your AI personas.
            </p>

            <h2>What is an Agent?</h2>
            <p>
                In PowerDirector, an Agent represents a specific configuration of an AI model. It is not just the LLM (Large Language Model) itself, but a combination of:
            </p>
            <ul>
                <li><strong>The Model</strong>: The specific AI provider and model version (e.g., OpenAI gpt-4, Anthropic claude-3).</li>
                <li><strong>System Prompts</strong>: The core instructions driving the agent's behavior and personality.</li>
                <li><strong>Skills</strong>: The tools the agent is permitted to execute (e.g., searching the web, running code).</li>
                <li><strong>Context Window</strong>: Memory limitations and token budgets.</li>
            </ul>

            <h2>Creating an Agent</h2>
            <p>
                Navigate to <strong>Agents</strong> in the sidebar. Click the "New Agent" button. You will be prompted to provide a name and select a base model from your configured providers.
            </p>
            <p>
                <strong>Important</strong>: You must have your AI Provider API keys configured in the <strong>Config &rarr; Models</strong> section before an agent can successfully generate responses.
            </p>

            <h2>Agent Binding</h2>
            <p>
                An agent does nothing on its own until it is bound to a <strong>Channel</strong>.
            </p>
            <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg my-4">
                <h4 className="text-yellow-400 m-0 mb-2">Binding Explained</h4>
                <p className="m-0 text-sm">
                    Think of bindings like answering a phone. A Channel is a phone line. The Agent is the person assigned to answer that specific phone line. You configure this under <strong>Config &rarr; Bindings</strong>.
                </p>
            </div>

            <h2>Expert Features</h2>
            <h3>Concurrency and Rate Limits</h3>
            <p>
                Experts can configure agent-specific concurrency limits to prevent a single highly-active Discord channel from exhausting API quota simultaneously.
            </p>
        </div>
    );
}
