export default function InstancesDocs() {
    return (
        <div className="space-y-6">
            <h1>Instances Overview</h1>
            <p className="lead">
                Instances represent the active, running components of your PowerDirector environment.
            </p>

            <h2>Understanding Instances</h2>
            <p>
                While the PowerDirector UI provides centralized control, the actual execution of AI workloads, agent tasks, or specific channel connections may happen across multiple processes or even multiple servers. These are called <strong>Instances</strong>.
            </p>

            <h3>Types of Instances</h3>
            <ul>
                <li><strong>Core</strong>: The main PowerDirector orchestration server.</li>
                <li><strong>Worker</strong>: Dedicated processes spun up to handle heavy computational tasks (like executing user-provided code in a secure sandbox).</li>
                <li><strong>Remote Nodes</strong>: Other PowerDirector servers connected to your mesh network via Discovery.</li>
            </ul>

            <h2>Monitoring the Dashboard</h2>
            <p>
                The Instances page provides a bird's-eye view of your cluster's health:
            </p>
            <ul>
                <li><strong>Status</strong>: Online, Offline, or Restarting states.</li>
                <li><strong>Memory Usage</strong>: Critical for tracking potential memory leaks in active agents.</li>
                <li><strong>Active Sessions</strong>: How many concurrent conversations this instance is managing.</li>
            </ul>

            <h2>Expert: Instance Management</h2>
            <p>
                For scaled deployments, Instances can be managed via the PowerDirector CLI (`pdir`). You can forcefully terminate hung workers or instruct a specific instance to drain connections before a graceful restart.
            </p>
        </div>
    );
}
