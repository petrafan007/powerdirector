export default function SkillsDocs() {
    return (
        <div className="space-y-6">
            <h1>Agent Skills</h1>
            <p className="lead">
                Extend your Agent's capabilities beyond mere text generation by installing Skills.
            </p>

            <h2>What is a Skill?</h2>
            <p>
                LLMs (Large Language Models) are very good at predicting text, but by default, they cannot <em>do</em> anything. They can't browse the internet, they can't save files, and they cannot run code.
            </p>
            <p>
                A <strong>Skill</strong> fundamentally bridges this gap. It provides an API specification to the Agent (so the agent knows it exists) and contains the source code required to execute the action when the agent requests it.
            </p>

            <h2>Managing Skills</h2>
            <p>
                Navigate to <strong>Agents &rarr; Skills</strong> in the UI. Here you can browse, install, and update internal system skills.
            </p>

            <h3>Core Skills Included:</h3>
            <ul>
                <li><strong>Terminal/Exec</strong>: Allows the agent to run raw Bash commands on the host server. <em>Extremely dangerous; use with approvals enabled.</em></li>
                <li><strong>Web Search</strong>: Connects your agent to external search engines (requires config keys) to fetch real-time information.</li>
                <li><strong>Filesystem Read/Write</strong>: Grants local directory access for autonomous agentic coding workflows.</li>
            </ul>

            <h2>Developer: Writing Custom Skills</h2>
            <p>
                Expert developers can create Custom Skills. A custom skill requires two primary components:
                1. A JSON Schema defining the expected inputs.
                2. A TypeScript execute handler.
            </p>
            <p>
                Drop your custom skill folder into the `/skills/` directory of your PowerDirector installation to register it via the Gateway.
            </p>
        </div>
    );
}
