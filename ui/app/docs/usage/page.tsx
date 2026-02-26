export default function UsageDocs() {
    return (
        <div className="space-y-6">
            <h1>Usage & Costs</h1>
            <p className="lead">
                Monitor your LLM API consumption across all active Agents and Channels.
            </p>

            <h2>Why Usage Matters</h2>
            <p>
                Every interaction you or your users have with an Agent consumes "Tokens". Because providers like OpenAI, Anthropic, and Google charge based on processing these tokens, active bots in high-traffic channels can silently rack up significant bills.
            </p>
            <p>
                The <strong>Usage</strong> tab serves as your primary financial dashboard for PowerDirector.
            </p>

            <h2>Understanding Metrics</h2>
            <ul>
                <li><strong>Input Tokens (Prompt)</strong>: The amount of text sent to the AI. Note that because <em>Sessions</em> prepend conversation history automatically, Input Tokens typically grow larger as a conversation goes on.</li>
                <li><strong>Output Tokens (Completion)</strong>: The literal words the AI generates in response.</li>
                <li><strong>Estimated Cost</strong>: PowerDirector uses a built-in price card for major models to calculate an estimated running cost across your platforms.</li>
            </ul>

            <h2>Cost Controls</h2>
            <p>
                To prevent runaway costs:
            </p>
            <ol>
                <li><strong>Context Windows</strong>: Heavily restrict your agent's Session Memory length under Config if you do not need it to remember older parts of a conversation.</li>
                <li><strong>Binding Approvals</strong>: Use the Approval hook on the Gateway to intercept all incoming Channel messages and reject them if user rate limits are hit.</li>
                <li><strong>Smaller Models</strong>: Default to significantly cheaper models (e.g., GPT-4o-mini instead of GPT-4) unless specialized reasoning is required.</li>
            </ol>
        </div>
    );
}
