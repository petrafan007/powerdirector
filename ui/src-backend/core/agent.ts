// @ts-nocheck
import { SessionManager } from '../state/session-manager.ts';
import { UsageManager } from '../state/usage-manager.ts';
import { ProviderExecutionMetadata, ProviderRouter } from '../reliability/router.ts';
import { ContextPruner } from '../context/pruner.ts';
import { ToolRegistry } from '../tools/base.ts';
import { Message } from '../context/types.ts';
import { MemoryManager } from './memory';

interface AgentOptions {
    runTimeoutMs?: number;
    compactionThreshold?: number;
    maxTurns?: number;
    suppressToolErrors?: boolean;
    humanDelayMs?: number;
    resetTriggers?: string[];
}

interface RunStepOptions {
    systemPrompt?: string;
    modelHint?: string;
    reasoningHint?: 'low' | 'medium' | 'high' | 'xhigh';
    agentId?: string;
    toolAllowlist?: string[];
    attachments?: any[];
    onStep?: (message: Message) => void;
    appendRunBuffer?: (text: string) => void;
    abortSignal?: AbortSignal;
    continue?: boolean;
    /** Configured fallback chain (primary + fallbacks from config) used when override provider fails. */
    fallbackChain?: string[];
    onFallback?: (metadata: any) => void;
    runId?: string;
    /** If true, the "AVAILABLE TOOLS" block will be omitted from the text prompt (useful for providers with native tool support). */
    skipToolsInText?: boolean;
}

export class Agent {
    private readonly options: Required<AgentOptions>;

    /**
     */
    public abortActiveRun(reason = 'aborted'): boolean {
        // or all shell instances. The gateway already individually aborts the specific session via options.abortSignal.
        // Keeping this method signature for interface compatibility, but neutering its global destructiveness.
        console.log(`[Agent] abortActiveRun called (No-op in multi-user gateway). Reason: ${reason}`);
        return true;
    }

    constructor(
        private sessionManager: SessionManager,
        private usageManager: UsageManager,
        private providerRouter: ProviderRouter,
        private contextPruner: ContextPruner,
        private tools: ToolRegistry,
        private memoryManager?: MemoryManager,
        options: AgentOptions = {}
    ) {
        this.options = {
            runTimeoutMs: options.runTimeoutMs ?? 300000,
            compactionThreshold: options.compactionThreshold ?? 100,
            maxTurns: options.maxTurns ?? 20,
            suppressToolErrors: options.suppressToolErrors ?? false,
            humanDelayMs: options.humanDelayMs ?? 0,
            resetTriggers: options.resetTriggers || []
        };
    }

    public listTools(): string[] {
        return this.tools.list().map(t => t.name);
    }

    public getToolRegistry(): ToolRegistry {
        return this.tools;
    }

    public async runTool(name: string, args: any, allowlist?: string[], options: { callId?: string; sessionId?: string; onOutput?: (data: string, metadata?: Record<string, any>) => void; signal?: AbortSignal } = {}): Promise<string> {
        if (!this.isToolAllowed(name, allowlist)) {
            return this.options.suppressToolErrors
                ? ""
                : `Error: Tool ${name} is not allowed by current binding policy.`;
        }
        const tool = this.tools.get(name);
        if (!tool) {
            return this.options.suppressToolErrors
                ? ""
                : `Error: Tool ${name} not found.`;
        }
        const result = await tool.execute(args, options);
        if (result.isError) {
            return this.options.suppressToolErrors ? "" : `Error: ${result.output}`;
        }
        return result.output;
    }

    public async generateCompletion(prompt: string, modelHint?: string): Promise<string> {
        return this.withTimeout(
            this.providerRouter.execute(prompt, modelHint),
            this.options.runTimeoutMs,
            `Completion timed out after ${this.options.runTimeoutMs}ms`
        );
    }


    public async runStep(sessionId: string, userMessage?: string, options: RunStepOptions = {}): Promise<string> {
        const runId = options.runId || `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const runStartTime = Date.now();
        console.log(`[Agent] Starting runStep for session ${sessionId} (runId: ${runId})`);
        const sessionData = this.sessionManager.getSession(sessionId);
        if (!sessionData) {
            console.error(`[Agent] Session ${sessionId} not found`);
            throw new Error(`Session ${sessionId} not found`);
        }

        let { messages } = sessionData;

        const isContinue = options.continue === true;

        if (!isContinue && (userMessage || (options.attachments && options.attachments.length > 0))) {
            let content: any = userMessage || '';
            if (options.attachments && options.attachments.length > 0) {
                // If it's just text, make it an array
                if (typeof content === 'string') {
                    content = [{ type: 'text', text: content }];
                }
                // Append attachments
                content.push(...options.attachments.map((a: any) => ({
                    type: a.category === 'image' ? 'image' : 'file',
                    ...a
                })));
            }

            const msg: Message = {
                role: 'user',
                content,
                timestamp: runStartTime
            };

            // resetTriggers: If user message matches a trigger, reset the session history first.
            const lowerUserMsg = typeof userMessage === 'string' ? userMessage.toLowerCase().trim() : '';
            if (lowerUserMsg && this.options.resetTriggers.some(t => lowerUserMsg === t.toLowerCase().trim())) {
                console.log(`[Agent] Reset trigger "${lowerUserMsg}" detected. Resetting session history.`);
                this.sessionManager.clearSession(sessionId);
                // After clearing, we need to re-add the user message that triggered it if we want it to start a fresh thread.
                this.sessionManager.saveMessage(sessionId, msg);
                messages = [msg];
            } else {
                this.sessionManager.saveMessage(sessionId, msg);
                messages.push(msg);
            }
        }

        // Session-level auto-compaction by message count before token pruning.
        if (messages.length > this.options.compactionThreshold) {
            await this.tryAutoCompact(sessionId, messages, options.modelHint);
            // Re-load messages from session manager to get the compacted state
            const refreshed = this.sessionManager.getSession(sessionId);
            if (refreshed) {
                messages = refreshed.messages;
            }
        }

        const prunedMessages = this.contextPruner.prune(messages);
        console.log(`[Agent] Context pruned to ${prunedMessages.length} messages`);

        const toolDefs = this.tools
            .getDefinitions()
            .filter((tool: any) => this.isToolAllowed(tool?.name, options.toolAllowlist));

        // RAG / Memory Search
        if (this.memoryManager && options.agentId && userMessage) {
            try {
                const memories = await this.memoryManager.search(options.agentId, userMessage, {
                    sessionKey: sessionId
                });
                if (memories.length > 0) {
                    const memoryText = this.memoryManager.formatSearchResults(options.agentId, memories);
                    const memorySection = `\n\nRELEVANT MEMORY:\n${memoryText}`;
                    options.systemPrompt = (options.systemPrompt || '') + memorySection;
                    console.log(`[Agent] Injected ${memories.length} memory snippets.`);
                }
            } catch (err: any) {
                console.warn(`[Agent] Memory search failed: ${err.message}`);
            }
        }

        // If the tool definitions are massive, automatically skip them in the text prompt to avoid OOM/context limits
        // especially if we are passing them natively to the router anyway.
        if (options.skipToolsInText === undefined) {
            const toolDefsJson = JSON.stringify(toolDefs);
            if (toolDefsJson.length > 10000) {
                console.log(`[Agent] Tool definitions are large (${toolDefsJson.length} chars). Automatically skipping them in text prompt.`);
                options.skipToolsInText = true;
            }
        }

        let prompt = this.formatPrompt(prunedMessages, toolDefs, options);
        const stepTimeoutMs = (options.attachments && options.attachments.length > 0)
            ? Math.max(this.options.runTimeoutMs, 300000)
            : this.options.runTimeoutMs;

        let responseText = '';
        let loopEndedWithTool = false;
        let responseMetadata: ProviderExecutionMetadata | undefined;
        let streamRetryCount = 0;
        let toolIntentRepairCount = 0;

        // Dynamic turn limit: Use configured maxTurns, or default to 10 for Ollama, 20 for others
        const isLocalOllama = options.modelHint?.toLowerCase().includes('ollama');
        const maxTurns = this.options.maxTurns ?? (isLocalOllama ? 10 : 20);

        let turnSequence = 1;

        let currentTurn = 0;
        for (let i = 0; i < maxTurns; i++) {
            currentTurn = i + 1;
            if (options.abortSignal?.aborted) {
                console.log(`[Agent] Run paused for session ${sessionId} at turn ${currentTurn}`);
                const pauseMsg: Message = {
                    role: 'assistant',
                    content: `[Iteration paused at Turn ${currentTurn}]`,
                    timestamp: Date.now(),
                    metadata: {
                        limitReached: 'paused',
                        status: 'completed',
                        runId,
                        sequence: turnSequence++
                    }
                };
                this.sessionManager.saveMessage(sessionId, pauseMsg);
                if (options.onStep) options.onStep(pauseMsg);
                return responseText || "Paused.";
            }

            console.log(`[Agent] Thinking (Turn ${currentTurn}/${maxTurns})... timeout=${stepTimeoutMs}ms`);

            if (this.options.humanDelayMs > 0) {
                const delay = Math.min(this.options.humanDelayMs, 10000); // Caps at 10s for safety
                console.log(`[Agent] Simulating human delay: ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
                const execution = await this.withTimeout(
                    this.providerRouter.executeStream(prompt, options.modelHint, {
                        attachments: options.attachments,
                        reasoning: options.reasoningHint,
                        maxExecutionMs: stepTimeoutMs,
                        signal: options.abortSignal,
                        fallbackChain: options.fallbackChain,
                        tools: toolDefs.map(td => ({
                            type: 'function',
                            function: {
                                name: td.name,
                                description: td.description,
                                parameters: td.parameters
                            }
                        })),
                        onFallback: (metadata: any) => {
                            console.log(`[Agent] Fallback occurred: ${metadata.fallbackFromProvider} -> ${metadata.provider}`);
                            // Notify UI via onStep
                            if (options.onStep) {
                                options.onStep({
                                    role: 'assistant',
                                    content: `[System: ${metadata.fallbackFromProvider || 'Primary'} failed. Falling back to ${metadata.provider}${metadata.model ? `/${metadata.model}` : ''}]`,
                                    timestamp: runStartTime + turnSequence,
                                    metadata: {
                                        type: 'notification',
                                        status: 'fallback',
                                        ...metadata
                                    }
                                });
                            }
                            // Sticky Model (Run Scope): Update modelHint for subsequent turns in this same runStep loop.
                            options.modelHint = `${metadata.provider}${metadata.model ? `/${metadata.model}` : ''}`;
                            // Notify Gateway (Session Scope)
                            if (options.onFallback) options.onFallback(metadata);
                        },
                        onRetry: (info: any) => {
                            if (!options.onStep) return;
                            const providerLabel = info.model
                                ? `${info.provider}/${info.model}`
                                : info.provider;
                            options.onStep({
                                role: 'assistant',
                                content: `[System: ${providerLabel} retry ${info.attempt}/${info.maxRetries} in ${info.delayMs}ms (${info.reason})]`,
                                timestamp: runStartTime + turnSequence,
                                metadata: {
                                    type: 'notification',
                                    status: 'retrying',
                                    turn: currentTurn,
                                    runId,
                                    sequence: turnSequence,
                                    provider: info.provider,
                                    model: info.model,
                                    retryAttempt: info.attempt,
                                    retryMaxAttempts: info.maxRetries
                                }
                            });
                        }
                    }),
                    stepTimeoutMs,
                    `Agent step timed out after ${stepTimeoutMs}ms (Turn ${currentTurn})`
                );

                console.log(`[Agent] Turn ${currentTurn} pruned history: ${prunedMessages.length} messages, prompt length: ${prompt.length} chars (~${Math.ceil(prompt.length / 4)} tokens).`);

                responseMetadata = execution.metadata;
                responseText = '';

                // Incremental processing: detect tool calls and update UI
                for await (const chunk of execution.stream) {
                    responseText += chunk;
                    if (options.appendRunBuffer) options.appendRunBuffer(chunk);

                    if (options.onStep) {
                        options.onStep({
                            role: 'assistant',
                            content: responseText,
                            timestamp: runStartTime + turnSequence,
                            metadata: {
                                type: 'status',
                                status: 'thinking',
                                turn: currentTurn,
                                runId,
                                sequence: turnSequence, // Use current sequence for status updates
                                ...responseMetadata
                            }
                        });
                    }

                    // Check for tool call early to reduce latency (PowerDirector: Removed to prevent truncated JSON)
                    // if (this.findToolCall(responseText)) {
                    //     console.log(`[Agent] Early tool call detected in stream (Turn ${currentTurn}).`);
                    //     break;
                    // }
                }
                console.log(`[Agent] Turn ${currentTurn} completed successfully.`);
                streamRetryCount = 0;
                turnSequence++; // Increment after successful turn
            } catch (err: any) {
                if (options.abortSignal?.aborted || err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
                    console.log(`[Agent] Execution aborted for session ${sessionId} at turn ${currentTurn}`);
                    const abortMsg: Message = {
                        role: 'assistant',
                        content: responseText + "\n\n[Execution stopped by user]",
                        timestamp: Date.now(),
                        metadata: {
                            status: 'completed',
                            aborted: true,
                            runId,
                            sequence: turnSequence++
                        }
                    };
                    this.sessionManager.saveMessage(sessionId, abortMsg);
                    if (options.onStep) options.onStep(abortMsg);
                    return responseText || "Aborted.";
                }

                if (this.isRetryableStreamError(err) && streamRetryCount < 2) {
                    streamRetryCount++;
                    const providerLabel = err?.provider || responseMetadata?.provider || 'provider';
                    const retryReasonRaw =
                        typeof err?.message === 'string' && err.message.trim().length > 0
                            ? err.message.trim()
                            : String(err);
                    const retryReason = retryReasonRaw.replace(/\s+/g, ' ').trim().slice(0, 200);
                    console.warn(
                        `[Agent] Recoverable stream failure for ${providerLabel} on turn ${currentTurn}. Retrying (${streamRetryCount}/2). Error: ${err?.message || String(err)}`
                    );
                    if (options.onStep) {
                        options.onStep({
                            role: 'assistant',
                            content: `[System: ${providerLabel} stream interrupted (${retryReason || 'unknown reason'}). Retrying with fallback…]`,
                            timestamp: runStartTime + turnSequence,
                            metadata: {
                                type: 'notification',
                                status: 'retrying',
                                turn: currentTurn,
                                runId,
                                sequence: turnSequence,
                                provider: providerLabel
                            }
                        });
                    }
                    responseText = '';
                    prompt = this.formatPrompt(this.contextPruner.prune(messages), toolDefs, options);
                    continue;
                }

                console.error(`[Agent] LLM execution failed on Turn ${currentTurn}: ${err.message}`);
                if (err.message.includes('timed out')) {
                    console.error(`[Agent] Timeout details: sessionId=${sessionId}, model=${options.modelHint}, turns=${currentTurn}`);

                    const timeoutMsg: Message = {
                        role: 'assistant',
                        content: "Sorry, the agent has time out. Continue?",
                        timestamp: Date.now(),
                        metadata: {
                            limitReached: 'timeout',
                            status: 'completed',
                            runId,
                            sequence: turnSequence++
                        }
                    };
                    this.sessionManager.saveMessage(sessionId, timeoutMsg);
                    if (options.onStep) options.onStep(timeoutMsg);
                    return responseText || "Timeout occurred.";
                }
                throw err;
            }

            console.log(`[Agent] LLM response (${responseText.length} chars): "${responseText.slice(0, 100)}${responseText.length > 100 ? '...' : ''}"`);

            // otherwise the UI will hang in "Thinking..." because it never receives a completed step.
            if (responseText.length === 0) {
                console.warn(`[Agent] TURN ${currentTurn} PRODUCED 0 CHARS. This usually means the model refused to respond or the prompt was too large/confusing.`);

                const zeroCharErrorMsg = `System Error: The LLM returned an empty response. This may indicate the context window is full, the prompt was rejected by safety filters, or the underlying provider failed silently.`;

                const errorFeedbackMsg: Message = {
                    role: 'assistant',
                    content: zeroCharErrorMsg,
                    timestamp: Date.now(),
                    metadata: {
                        status: 'error',
                        error: '0 chars returned',
                        turn: currentTurn,
                        runId,
                        sequence: turnSequence++
                    }
                };

                this.sessionManager.saveMessage(sessionId, errorFeedbackMsg);
                if (options.onStep) options.onStep(errorFeedbackMsg);

                if (messages.length > 10) {
                    console.log(`[Agent] Auto-compacting session ${sessionId} after 0-char response (${messages.length} messages)`);
                    await this.tryAutoCompact(sessionId, messages, options.modelHint);
                }

                return zeroCharErrorMsg;
            }

            loopEndedWithTool = false;

            const extractedJson = this.findToolCall(responseText);

            if (extractedJson) {
                try {
                    const toolCall = JSON.parse(extractedJson);
                    let toolName = toolCall.tool || toolCall.name;
                    let toolArgs = toolCall.args;

                    // Support cases where the model puts arguments at the top level or uses other field names
                    if (toolName && !toolArgs) {
                        const { tool, name, ...rest } = toolCall;
                        if (Object.keys(rest).length > 0) {
                            console.log(`[Agent] Recovered args from top-level fields for tool: ${toolName}`);
                            toolArgs = rest;
                        }
                    }

                    // Compatibility: some models emit tool args directly (e.g. {"action":"..."}).
                    // If we can infer exactly one action-capable tool, treat it as that tool call.
                    if (!toolName && toolCall && typeof toolCall === 'object' && typeof toolCall.action === 'string') {
                        const actionTools = toolDefs.filter((def: any) => {
                            const properties = def?.parameters?.properties;
                            return Boolean(properties && typeof properties === 'object' && Object.prototype.hasOwnProperty.call(properties, 'action'));
                        });
                        const inferred = actionTools.length === 1
                            ? actionTools[0]
                            : actionTools.find((def: any) => def?.name === 'frigate');
                        if (inferred?.name) {
                            toolName = inferred.name;
                            toolArgs = toolCall;
                            console.log(`[Agent] Inferred action-style tool call as: ${toolName}`);
                        }
                    }

                    if (toolName && toolArgs) {
                        const callId = Math.random().toString(36).substring(7);

                        // Extract any conversational text BEFORE the tool call JSON
                        // Strip markdown code blocks containing the tool call
                        let conversationalText = responseText
                            .replace(/```json\s*[\s\S]*?```\s*/g, '')  // Remove JSON code blocks
                            .replace(/```\s*[\s\S]*?```\s*/g, '')       // Remove any other code blocks with tool calls
                            .trim();

                        // If there's meaningful conversational text (more than just whitespace), save it as a separate message
                        if (conversationalText.length > 20) {
                            const conversationalMsg: Message = {
                                role: 'assistant',
                                content: conversationalText,
                                timestamp: runStartTime + turnSequence,
                                metadata: {
                                    turn: currentTurn,
                                    runId,
                                    status: 'completed',
                                    sequence: turnSequence++,
                                    provider: responseMetadata?.provider,
                                    model: responseMetadata?.model
                                }
                            };
                            this.sessionManager.saveMessage(sessionId, conversationalMsg);
                            messages.push(conversationalMsg);
                            if (options.onStep) options.onStep(conversationalMsg);
                        }

                        // Tool execution message - show the tool name and args for visibility
                        const toolCallbackMsg: Message = {
                            role: 'assistant',
                            content: JSON.stringify({ tool: toolName, args: toolArgs }, null, 2),
                            timestamp: runStartTime + turnSequence,
                            metadata: {
                                callId,
                                tool: toolName,
                                status: 'running',
                                turn: currentTurn,
                                runId,
                                sequence: turnSequence++,
                                provider: responseMetadata?.provider,
                                model: responseMetadata?.model,
                                fallbackUsed: responseMetadata?.fallbackUsed,
                                fallbackFromProvider: responseMetadata?.fallbackFromProvider,
                                fallbackFromModel: responseMetadata?.fallbackFromModel
                            }
                        };
                        this.sessionManager.saveMessage(sessionId, toolCallbackMsg);
                        messages.push(toolCallbackMsg);
                        if (options.onStep) options.onStep(toolCallbackMsg);

                        console.log(`[Agent] [${callId}] Executing tool: ${toolName}`, toolArgs);
                        const toolOutput = await this.runTool(toolName, toolArgs, options.toolAllowlist, {
                            callId,
                            sessionId,
                            signal: options.abortSignal,
                            onOutput: (chunk, metadata) => {
                                if (options.onStep) {
                                    options.onStep({
                                        role: 'assistant',
                                        content: chunk,
                                        timestamp: runStartTime + turnSequence,
                                        metadata: { callId, tool: toolName, type: 'output', turn: currentTurn, runId, ...metadata }
                                    });
                                }
                            }
                        });

                        // Update the original assistant message status to 'completed'
                        try {
                            const updatedMetadata = { ...toolCallbackMsg.metadata, status: 'completed' };
                            this.sessionManager.updateMessageMetadata(sessionId, toolCallbackMsg.timestamp, updatedMetadata);
                            toolCallbackMsg.metadata = updatedMetadata;
                        } catch (err) {
                            console.error(`[Agent] [${callId}] Failed to update assistant message status:`, err);
                        }
                        console.log(`[Agent] [${callId}] Tool output (${toolOutput.length} chars)`);

                        const toolResultMsg: Message = {
                            role: 'user',
                            content: `[Tool Output for ${toolName}]:\n${toolOutput}`,
                            timestamp: runStartTime + turnSequence,
                            metadata: {
                                callId,
                                tool: toolName,
                                status: 'completed',
                                turn: currentTurn,
                                runId,
                                sequence: turnSequence++ // Ensure it comes after the tool run msg
                            }
                        };
                        this.sessionManager.saveMessage(sessionId, toolResultMsg);
                        messages.push(toolResultMsg);
                        if (options.onStep) options.onStep(toolResultMsg);

                        prompt = this.formatPrompt(this.contextPruner.prune(messages), toolDefs, options);
                        loopEndedWithTool = true;
                        continue;
                    }
                } catch (err: any) {
                    console.error(`[Agent] [Turn ${currentTurn}] Failed to parse tool call: ${err.message}`);
                    console.error(`[Agent] [Turn ${currentTurn}] Malformed JSON (${extractedJson.length} chars): "${extractedJson.slice(0, 200)}${extractedJson.length > 200 ? '...' : ''}"`);
                    console.error(`[Agent] [Turn ${currentTurn}] JSON Snippet around error: "${extractedJson.slice(Math.max(0, (err.pos || 0) - 100), Math.min(extractedJson.length, (err.pos || 0) + 100))}"`);

                    const errorMsg: Message = {
                        role: 'assistant',
                        content: `System Error: Failed to parse tool call. The LLM provided malformed JSON.\n\nError: ${err.message}`,
                        timestamp: Date.now(),
                        metadata: {
                            status: 'error',
                            error: err.message,
                            turn: currentTurn,
                            runId,
                            sequence: turnSequence++
                        }
                    };
                    this.sessionManager.saveMessage(sessionId, errorMsg);
                    messages.push(errorMsg);
                    if (options.onStep) options.onStep(errorMsg);

                    // Re-prompt the model with the error
                    prompt = this.formatPrompt(this.contextPruner.prune(messages), toolDefs, options);
                    loopEndedWithTool = true; // Pretend we "ended with tool" so we don't hit the "no tool call" break
                    continue;
                }
            }

            const looksLikeToolIntent = this.looksLikeToolIntentWithoutCall(responseText, toolDefs);
            if (looksLikeToolIntent && toolIntentRepairCount < 2) {
                toolIntentRepairCount++;
                console.warn(`[Agent] Detected tool intent without callable JSON on turn ${currentTurn}. Requesting a strict tool call format.`);
                messages.push({
                    role: 'user',
                    content: 'System: You described planned tool usage but did not output a valid tool call JSON. If a tool is needed, respond with ONLY one JSON object in the format {"tool":"tool_name","args":{...}}. Do not include markdown, planning text, or explanation. If no tool is needed, provide the final answer now with no planning or tool discussion.',
                    timestamp: Date.now(),
                    metadata: {
                        internal: true,
                        turn: currentTurn,
                        runId,
                        sequence: turnSequence++
                    }
                } as Message);
                prompt = this.formatPrompt(this.contextPruner.prune(messages), toolDefs, options);
                loopEndedWithTool = true;
                continue;
            }

            if (looksLikeToolIntent) {
                console.warn(`[Agent] Repeated tool intent without callable JSON on turn ${currentTurn}. Returning a concise error instead of surfacing planning text.`);
                const toolIntentErrorMsg: Message = {
                    role: 'assistant',
                    content: 'System Error: The model described tool usage without emitting a valid tool-call JSON. Please retry or switch models.',
                    timestamp: Date.now(),
                    metadata: {
                        status: 'error',
                        error: 'tool-intent-without-call',
                        turn: currentTurn,
                        runId,
                        sequence: turnSequence++
                    }
                };
                this.sessionManager.saveMessage(sessionId, toolIntentErrorMsg);
                if (options.onStep) options.onStep(toolIntentErrorMsg);
                return toolIntentErrorMsg.content as string;
            }

            console.log('[Agent] No tool call detected, finishing loop.');
            break;
        }

        // If we hit the turn limit, notify UI
        if (loopEndedWithTool) {
            console.log(`[Agent] Max turns (${maxTurns}) reached for session ${sessionId}.`);
            const turnLimitMsg: Message = {
                role: 'assistant',
                content: `Agent has gone ${maxTurns} turns, continue?`,
                timestamp: Date.now(),
                metadata: {
                    limitReached: 'turns',
                    status: 'completed',
                    runId,
                    sequence: turnSequence++
                }
            };
            this.sessionManager.saveMessage(sessionId, turnLimitMsg);
            if (options.onStep) options.onStep(turnLimitMsg);
            return responseText || "Turn limit reached.";
        }

        const assistantMsg: Message = {
            role: 'assistant',
            content: responseText,
            timestamp: Date.now(),
            metadata: {
                turn: currentTurn,
                runId,
                status: 'completed',
                sequence: turnSequence++
            }
        };
        this.sessionManager.saveMessage(sessionId, assistantMsg);

        console.log(`[Agent] runStep completed for session ${sessionId}`);

        // Usage Logging (Estimated)
        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(responseText.length / 4);
        // Approximate cost (e.g. $3/$15 per M tokens - simplified generic average)
        const cost = (inputTokens * 3 + outputTokens * 15) / 1000000;

        try {
            this.usageManager.logUsage({
                sessionId,
                model: responseMetadata?.model || options.modelHint || 'unknown',
                provider: responseMetadata?.provider || 'unknown',
                inputTokens,
                outputTokens,
                cost
            });
        } catch (e) {
            console.error('[Agent] Failed to log usage:', e);
        }

        return responseText;
    }

    private formatPrompt(messages: Message[], tools: any[], options: RunStepOptions): string {
        const policyLines: string[] = [];
        if (options.agentId) {
            policyLines.push(`BOUND_AGENT: ${options.agentId}`);
        }
        if (options.modelHint) {
            policyLines.push(`MODEL_HINT: ${options.modelHint}`);
        }
        if (options.reasoningHint) {
            policyLines.push(`REASONING_HINT: ${options.reasoningHint}`);
        }
        if (options.systemPrompt) {
            policyLines.push(`SYSTEM_PROMPT:\n${options.systemPrompt}`);
        }
        const policySection = policyLines.length > 0
            ? `${policyLines.join('\n')}\n\n`
            : '';

        const history = messages.map(m => {
            const content = Array.isArray(m.content)
                ? m.content.map(p => p.type === 'text' ? p.text : '[Image]').join('')
                : m.content;
            return `${m.role.toUpperCase()}: ${content}`;
        }).join('\n\n');

        const toolSection = (tools.length > 0 && !options.skipToolsInText)
            ? `\n\nAVAILABLE TOOLS:\n${JSON.stringify(tools, null, 2)}\n\nTo use a tool, respond with a JSON block like:\n\`\`\`json\n{"tool": "tool_name", "args": {...}}\n\`\`\`\nCRITICAL: My shell tool is HIGH-FIDELITY and FULLY INTERACTIVE. I am capable of running commands that require user input (like sudo, password prompts, or interactive installers). I should ALWAYS run the command FIRST and let the interactive interface handle the input. Never ask the user for a password or confirmation in conversational text if a tool can handle it.\n\nIMPORTANT: When working with Frigate NVR cameras, ALWAYS use the "frigate" tool instead of curl/shell commands. The frigate tool properly validates images and saves them to the correct location. Using curl to fetch images will result in broken/unvalidated files.\n\nIMPORTANT: Once you receive the output from a tool call, do NOT repeat the same tool call with the same arguments unless absolutely necessary. Instead, provide a final response summarizing the results or proceed to the next step.\n\nCRITICAL OUTPUT POLICY: When providing a final response, be concise and direct. DO NOT describe internal planning or thought processes. Provide the synthesized answer directly.\n`
            : '';

        return `${policySection}${history}${toolSection}\n\nASSISTANT:`;
    }

    private isToolAllowed(toolName: string, allowlist?: string[]): boolean {
        if (!Array.isArray(allowlist)) return true;
        if (allowlist.length === 0) return false;
        return allowlist.includes(toolName);
    }

    private async tryAutoCompact(sessionId: string, messages: Message[], modelHint?: string): Promise<void> {
        const threshold = this.options.compactionThreshold;
        if (messages.length <= threshold) return;

        console.log(`[Agent] Compacting messages: ${messages.length} > ${threshold}`);

        // Keep the most recent messages (e.g., 20% of threshold or at least 10)
        const keepLastN = Math.max(10, Math.floor(threshold * 0.2));

        if (messages.length <= keepLastN + 4) {
            console.log(`[Agent] Not enough messages to summarize meaningfully (Length: ${messages.length}, Keep: ${keepLastN}).`);
            return;
        }

        const toSummarize = messages.slice(0, -keepLastN);
        const historyText = toSummarize.map(m => {
            const content = Array.isArray(m.content)
                ? m.content.map((p: any) => p.type === 'text' ? p.text : '[Media]').join('')
                : (typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
            return `${m.role.toUpperCase()}: ${content}`;
        }).join('\n\n');

        const prompt = `Please summarize the following conversation history into a concise but comprehensive paragraph. Preserve key context, user goals, important project details, and any decisions made. This summary will serve as the context baseline for this session.\n\nCONVERSATION:\n${historyText}\n\nSUMMARY:`;

        try {
            console.log(`[Agent] Running auto-compaction summary for session ${sessionId} (using model: ${modelHint || 'default'})...`);
            // Use a shorter timeout for compaction to avoid blocking the user request for too long
            const summary = await this.withTimeout(
                this.providerRouter.execute(prompt, modelHint, { reasoning: 'low' }),
                30000, // 30s max for compaction summary
                'Compaction summary timed out'
            );
            if (summary && summary.trim().length > 0) {
                this.sessionManager.compactSession(sessionId, summary.trim(), keepLastN);
                console.log(`[Agent] Session ${sessionId} auto-compacted.`);
            }
        } catch (error: any) {
            console.warn(`[Agent] Auto-compaction failed: ${error.message}.`);
        }
    }

    public async generateSessionTitle(sessionId: string, userPrompt: string, agentResponse: string, modelHint?: string): Promise<void> {
        const prompt = `Generate a very short, concise 3-5 word conceptual title for this conversation based on the user's initial prompt and the assistant's reply. Respond ONLY with the title string, no quotes, no markdown, no punctuation.\n\nUser: ${userPrompt}\nAssistant: ${agentResponse}\n\nTITLE:`;

        try {
            console.log(`[Agent] Generating session title for ${sessionId} (using model: ${modelHint || 'default'})...`);
            const title = await this.providerRouter.execute(prompt, modelHint, { reasoning: 'low' });
            if (title && title.trim().length > 0) {
                const cleaned = title.trim().replace(/^["']|["']$/g, '').slice(0, 100);
                this.sessionManager.renameSession(sessionId, cleaned);
                console.log(`[Agent] Session ${sessionId} titled: ${cleaned}`);
            }
        } catch (error: any) {
            console.warn(`[Agent] Auto-titling failed: ${error.message}`);
        }
    }

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
        let timeout: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeout) clearTimeout(timeout);
        }
    }

    private findToolCall(text: string): string | null {
        // 1. Check for markdown blocks first (most reliable)
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) return jsonMatch[1].trim();

        // 2. Fallback to balanced brace search for raw JSON
        // We scan for any block starting with '{' that contains '"tool":'
        let searchIdx = 0;
        while (searchIdx < text.length) {
            const startIdx = text.indexOf('{', searchIdx);
            if (startIdx === -1) break;

            let depth = 0;
            let inString = false;
            let escaped = false;
            let foundMatch = false;

            for (let j = startIdx; j < text.length; j++) {
                const char = text[j];

                if (escaped) {
                    escaped = false;
                    continue;
                }

                if (char === '\\') {
                    escaped = true;
                    continue;
                }

                if (char === '"') {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (char === '{') depth++;
                    else if (char === '}') {
                        depth--;
                        if (depth === 0) {
                            const candidate = text.substring(startIdx, j + 1);
                            // Accept canonical tool call shape, plus action-style compatibility JSON.
                            if (
                                (candidate.includes('"tool":') && candidate.includes('"args":'))
                                || candidate.includes('"action":')
                            ) {
                                return candidate;
                            }
                            // Not a tool call, but a valid JSON block. Skip past it.
                            searchIdx = j + 1;
                            foundMatch = true;
                            break;
                        }
                    }
                }
            }

            if (!foundMatch) {
                // If we didn't find a balanced block starting at startIdx, 
                // move to the next possible start.
                searchIdx = startIdx + 1;
            }
        }
        return null;
    }

    private isRetryableStreamError(err: any): boolean {
        if (!err) return false;
        if (err?.name === 'AbortError') return false;
        if (typeof err?.message === 'string' && err.message.toLowerCase().includes('agent step timed out')) {
            return false;
        }
        if (err?.retryable === true) return true;
        const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
        if (!message) return false;
        return (
            message.includes('rate limit')
            || message.includes('429')
            || message.includes('no capacity')
            || message.includes('provider timed out')
            || message.includes('temporarily unavailable')
            || message.includes('overloaded')
        );
    }

    private looksLikeToolIntentWithoutCall(responseText: string, toolDefs: any[]): boolean {
        if (typeof responseText !== 'string' || responseText.trim().length === 0) {
            return false;
        }
        const normalized = responseText.toLowerCase();
        if (!normalized.includes('tool')) {
            return false;
        }
        const hasIntentLanguage = /(i will|i'll|let me|going to|i am going to|i'm going to|i can)/.test(normalized);
        if (!hasIntentLanguage) {
            return false;
        }
        return toolDefs.some((def: any) => {
            const toolName = typeof def?.name === 'string' ? def.name.toLowerCase() : '';
            return toolName.length > 0 && normalized.includes(toolName);
        });
    }
}
