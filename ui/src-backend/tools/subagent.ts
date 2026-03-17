// @ts-nocheck

import { Tool, ToolResult } from './base';
import { SessionManager } from '../state/session-manager.ts';
import { Gateway } from '../core/gateway.ts';
import { randomUUID } from 'crypto';

interface SubagentsToolOptions {
    sessionManager: SessionManager;
    getGateway: () => Gateway;
}

export class SubagentsTool implements Tool {
    name = 'subagents';
    description = 'Spawn a subagent to handle a complex task. The subagent runs in its own session and returns the result.';
    parameters = {
        type: 'object',
        properties: {
            task: {
                type: 'string',
                description: 'The task description for the subagent.'
            },
            label: {
                type: 'string',
                description: 'Optional label for the subagent session.'
            },
            agentId: {
                type: 'string',
                description: 'Specific agent ID to use for the subagent (e.g., "authenticator", "researcher").'
            },
            model: {
                type: 'string',
                description: 'Specific model to use (e.g., "gpt-4o", "claude-3-5-sonnet").'
            },
            thinking: {
                type: 'string',
                description: 'Thinking config (e.g. "on", "off", "min=1024").'
            },
            runTimeoutSeconds: {
                type: 'number',
                description: 'Timeout in seconds for the subagent run.'
            },
            cleanup: {
                type: 'string',
                enum: ['delete', 'keep'],
                description: 'Whether to delete the session after completion.'
            },
            expectsCompletionMessage: {
                type: 'boolean',
                description: 'If true, waits for a specific completion message.'
            }
        },
        required: ['task']
    };

    constructor(private options: SubagentsToolOptions) { }

    private getSubagentDepth(sessionId: string): number {
        const session = this.options.sessionManager.getSession(sessionId);
        if (!session) return 0;

        const metadata = session.session.metadata || {};
        if (typeof metadata.spawnDepth === 'number') {
            return metadata.spawnDepth;
        }

        // Fallback: traverse spawnedBy if available (though explicit depth is better)
        let depth = 0;
        let current = session.session;
        const visited = new Set<string>();

        // This traversal would require recursive DB lookups which might be heavy.
        // For now, relies on explicit `spawnDepth` metadata being set correctly at spawn time.
        return 0;
    }

    async execute(args: any, options?: { callId?: string; sessionId?: string; onOutput?: (data: string) => void }): Promise<ToolResult> {
        const { task, label, agentId, model, thinking, runTimeoutSeconds, cleanup } = args;
        const requesterSessionId = options?.sessionId;

        if (!requesterSessionId) {
            return {
                output: 'Error: No session ID provided for subagent spawning context.',
                isError: true
            };
        }

        const sessionManager = this.options.sessionManager;
        const gateway = this.options.getGateway();

        const requesterSession = sessionManager.getSession(requesterSessionId);
        if (!requesterSession) {
            return {
                output: `Error: Requester session ${requesterSessionId} not found.`,
                isError: true
            };
        }

        // Check depth
        const callerDepth = requesterSession.session.metadata?.spawnDepth || 0;
        const MAX_DEPTH = 3; // Configurable ideally, hardcoded for safety now

        if (callerDepth >= MAX_DEPTH) {
            return {
                output: `Error: Max subagent depth (${MAX_DEPTH}) reached. Cannot spawn further.`,
                isError: true
            };
        }

        // Create Child Session
        const childId = randomUUID();
        const childName = label ? `Subagent: ${label}` : `Subagent of ${requesterSession.session.name.slice(0, 20)}...`;

        const childMetadata = {
            spawnedBy: requesterSessionId,
            spawnDepth: callerDepth + 1,
            agentId: agentId || requesterSession.session.metadata?.agentId, // Inherit or override
            model: model || requesterSession.session.metadata?.model,
            thinking: thinking || requesterSession.session.metadata?.thinking,
            isSubagent: true
        };

        const childSession = sessionManager.createSession(childName, {
            metadata: childMetadata
        });

        // Construct System Prompt / Context for Child
        const childTaskMessage = `[Subagent Context] You are running as a subagent (depth ${childMetadata.spawnDepth}/${MAX_DEPTH}).\n[Task]: ${task}`;

        // Trigger Run
        try {
            // We use processInput to treat it as a user message arriving at the new session
            // forcing the agent to wake up and handle it.
            // We wait for the *result* of that turn.

            // Note: processInput returns the assistant response string.
            const { output } = await gateway.processInput(childSession.id, childTaskMessage, {
                senderId: 'system', // or requester
                metadata: {
                    subagentOrigin: requesterSessionId
                }
            });

            // Cleanup if requested
            if (cleanup === 'delete') {
                sessionManager.deleteSession(childSession.id);
            }

            return {
                output: `Subagent completed.\n\nResult:\n${output}`
            };

        } catch (error: any) {
            return {
                output: `Subagent execution failed: ${error.message}`,
                isError: true
            };
        }
    }
}
