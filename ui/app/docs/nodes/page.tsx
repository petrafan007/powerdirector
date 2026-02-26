import React from 'react';
import Link from 'next/link';

export default function SystemDocs() {
    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400">System, Nodes & Diagnostics</h1>
            <p className="lead border-b border-[var(--pd-border)] pb-6 mb-8">
                Learn how to hook into the underlying Node network, trace logs, and debug PowerDirector internals.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl mt-0">Nodes & Network</h2>
                    <p>
                        PowerDirector instances talk to each other to form a distributed network. A Node conceptually represents one active PowerDirector core service. Go to <Link href="/nodes" className="text-blue-400">/nodes</Link> to view peering status.
                    </p>
                    <p>
                        <strong>Discovery</strong> handles peer connectivity automatically, enabling you to deploy a worker node on a Raspberry Pi and have your cloud Core instance delegate local filesystem tasks to it instantly.
                    </p>
                </div>
                <div>
                    <h2 className="text-2xl mt-0">Diagnostics & Debug</h2>
                    <p>
                        The <Link href="/debug" className="text-blue-400">/debug</Link> view exposes raw application state:
                    </p>
                    <ul className="text-sm">
                        <li>Active memory handles</li>
                        <li>WebSocket connection counts</li>
                        <li>Unresolved internal Promises</li>
                        <li>Cache hit/miss ratios</li>
                    </ul>
                </div>
            </div>

            <h2 className="mt-8 border-t border-[var(--pd-border)] pt-8">System Logs</h2>
            <p>
                The <Link href="/logs" className="text-blue-400">/logs</Link> interface streams raw standard output (stdout/stderr) from the PowerDirector daemon directly to your browser over a secure WebSocket.
            </p>
            <p>
                <strong>Log Levels:</strong>
            </p>
            <ul className="list-disc ml-6 space-y-2">
                <li><strong className="text-blue-400">INFO</strong>: Routine startup routines and major state changes.</li>
                <li><strong className="text-green-400">DEBUG</strong>: Verbose connection data (useful when Discord bots fail to login).</li>
                <li><strong className="text-yellow-400">WARN</strong>: Rate limit approaching or minor non-fatal configuration errors.</li>
                <li><strong className="text-red-400">ERROR</strong>: Unhandled exceptions. Please report these.</li>
            </ul>

            <div className="bg-[var(--pd-surface-panel)] p-4 rounded-lg mt-6 font-mono text-sm border border-[var(--pd-border)]">
                {`> [INFO] Gateway Server listening on port 3333`}
                <br />
                {`> [DEBUG] Authenticated new WebSocket client id: 8f92a`}
                <br />
                {`> [ERROR] Model rate limit exceeded (429) returning 500 downstream`}
            </div>
        </div>
    );
}
