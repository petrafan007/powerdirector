export default function CronDocs() {
    return (
        <div className="space-y-6">
            <h1>Cron Jobs & Automation</h1>
            <p className="lead">
                Schedule recurring tasks, health checks, and proactive agent behaviors.
            </p>

            <h2>Overview</h2>
            <p>
                While Agents are typically reactive—waiting for a user to speak to them via a Channel—PowerDirector allows you to make agents proactive using the built-in Cron system.
            </p>
            <p>
                Cron Jobs are scheduled tasks defined using standard *nix cron expression syntax. When a schedule hits, PowerDirector triggers the associated task automatically.
            </p>

            <h2>Use Cases</h2>
            <ul>
                <li><strong>Daily Summaries</strong>: Schedule an agent at 8:00 AM to read system logs, summarize issues, and send a message to the team Discord Channel.</li>
                <li><strong>Health Checking</strong>: Ping external web services every 5 minutes and alert an agent if an endpoint goes down.</li>
                <li><strong>Database Upkeep</strong>: Trigger maintenance scripts or data-sync pipelines nightly.</li>
            </ul>

            <h2>Configuration</h2>
            <p>
                A Cron Job requires:
            </p>
            <ol>
                <li><strong>Expression</strong>: The standard scheduling string (e.g., `0 * * * *` for hourly).</li>
                <li><strong>Action Type</strong>: What to execute when the schedule triggers.
                    <ul>
                        <li><em>Event Hook</em>: Fire an internal event on the Gateway bus.</li>
                        <li><em>Agent Trigger</em>: Wake up a specific agent and inject a predefined context message, forcing it to generate a response.</li>
                        <li><em>Script Execution</em>: Run an arbitrary shell or Node.js script.</li>
                    </ul>
                </li>
            </ol>

            <div className="bg-emerald-900/20 border border-emerald-500/50 p-4 rounded-lg mt-8">
                <h4 className="text-emerald-400 m-0 mb-2">Caution: High Impact</h4>
                <p className="m-0 text-sm">
                    Misconfigured cron jobs triggering resource-heavy agents (e.g., executing GPT-4o every minute) can drain AI API credits incredibly fast. Always test cron expressions with dry-runs or lightweight actions first.
                </p>
            </div>
        </div>
    );
}
