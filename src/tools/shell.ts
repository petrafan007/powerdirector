// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import { platform } from 'os';

interface ShellToolOptions {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
}

export class ShellTool implements Tool {
    public name = 'shell';
    public description = 'Execute shell commands. Supports interactive input and real TTY.';
    public parameters = {
        type: 'object',
        properties: {
            command: { type: 'string', description: 'Command to execute' }
        },
        required: ['command']
    };
    private readonly cwd?: string;
    private readonly env: Record<string, string> | undefined;
    private readonly timeoutMs: number;

    /**
     * Active PTY processes keyed by callId (tool execution id).
     */
    private activeProcesses: Map<string, any> = new Map();

    /**
     * "Abort all" support to stop any running shell tool executions.
     */
    public abortAll(reason = 'aborted'): number {
        const entries = Array.from(this.activeProcesses.entries());
        if (entries.length === 0) return 0;

        for (const [callId, pty] of entries) {
            try {
                console.warn(`[ShellTool] [${callId}] Aborting PTY (${reason})`);
                try {
                    // Best-effort: send Ctrl+C first
                    pty.write('\x03');
                } catch { }
                try {
                    pty.kill();
                } catch { }
            } catch { }
            this.activeProcesses.delete(callId);
        }

        return entries.length;
    }

    constructor(options: ShellToolOptions = {}) {
        this.cwd = options.cwd;
        this.timeoutMs = options.timeoutMs ?? 300000;

        if (options.env) {
            const normalized: Record<string, string> = {};
            for (const [key, value] of Object.entries(options.env)) {
                if (typeof value === 'string') {
                    normalized[key] = value;
                }
            }
            this.env = normalized;
        }
    }

    private getPty() {
        try {
            return require('node-pty');
        } catch (e) {
            console.error('[ShellTool] Failed to load node-pty:', e);
            throw new Error('Terminal support (node-pty) not available on this system.');
        }
    }

    async execute(args: any, options: { callId?: string; onOutput?: (data: string, metadata?: Record<string, any>) => void; signal?: AbortSignal } = {}): Promise<ToolResult> {
        const { command } = args;
        if (!command) return { output: 'No command provided', isError: true };

        const callId = options.callId || Math.random().toString(36).substring(7);

        return new Promise((resolve) => {
            const { spawn } = this.getPty();

            let output = '';
            let resolved = false;
            let lastOutputTime = Date.now();
            let signalledWaiting = false;
            let lastSignalledOutputLength = 0;
            const startTime = Date.now();

            const shell = 'bash';

            console.log(`[ShellTool] [${callId}] Executing command via PTY: ${command}`);

            const pty = spawn(shell, ['-c', command], {
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: this.cwd || process.cwd(),
                env: {
                    ...(process.env as any),
                    ...(this.env || {}),
                    TERM: 'xterm-256color'
                }
            });

            this.activeProcesses.set(callId, pty);

            const timer = setInterval(() => {
                if (resolved) {
                    clearInterval(timer);
                    return;
                }

                const now = Date.now();
                const idleTime = now - lastOutputTime;

                try {
                    process.kill(pty.pid, 0);
                } catch (e) {
                    console.log(`[ShellTool] [${callId}] Process with pid ${pty.pid} no longer found. Resolving.`);
                    childExit();
                    return;
                }

                // Refined prompt detection: check for common patterns at the END of output
                // Only signal if idle for a bit
                // Strip ANSI codes before testing regex
                const cleanOutput = output.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trimEnd();
                const lastSlice = cleanOutput.slice(-100);
                const hasPrompt = /([\$#?]|password|token|key|code|passphrase|:\s*|[":]\s*)$/i.test(lastSlice);

                if (idleTime > 1200 && !signalledWaiting) {
                    // Log even if no prompt found, but only once per idle stretch to avoid spam
                    const trace = lastSlice.replace(/\n/g, '\\n');
                    console.log(`[ShellTool] [${callId}] Idle (${idleTime}ms). Output len: ${output.length}. Trace: "${trace}"`);

                    if (hasPrompt) {
                        // Only signal if the output has grown significantly since the last signal
                        // OR if this is the first signal. This prevents re-triggering on the same prompt
                        // just because the terminal echoed a newline or small junk.
                        if (!signalledWaiting || output.length > lastSignalledOutputLength + 10) {
                            console.log(`[ShellTool] [${callId}] Interactive prompt detected. Signaling waiting state. (output growth: ${output.length - lastSignalledOutputLength})`);
                            signalledWaiting = true;
                            lastSignalledOutputLength = output.length;
                            if (options.onOutput) {
                                options.onOutput('', { waitingForInput: true });
                            }
                        }
                    } else {
                        // Prevent repeated "Idle" logs
                        signalledWaiting = true;
                    }
                }

                if (now - startTime > this.timeoutMs) {
                    console.warn(`[ShellTool] [${callId}] Total timeout reached (${this.timeoutMs}ms)`);
                    childExit('\n[Command timed out]');
                }
            }, 1000);

            const abortHandler = () => {
                console.warn(`[ShellTool] [${callId}] AbortSignal received, terminating hanging shell process.`);
                childExit('\n[Command Aborted by system/user]');
            };

            if (options.signal) {
                options.signal.addEventListener('abort', abortHandler);
            }

            const childExit = (extra: string = '') => {
                if (resolved) return;
                resolved = true;
                clearInterval(timer);
                if (options.signal) options.signal.removeEventListener('abort', abortHandler);
                this.activeProcesses.delete(callId);
                console.log(`[ShellTool] [${callId}] Resolving tool execution.`);
                resolve({ output: output + extra });
                try { pty.kill(); } catch (e) { }
            };

            pty.onData((data: string) => {
                output += data;
                lastOutputTime = Date.now();
                // We no longer reset signalledWaiting here because we handle re-triggering 
                // via lastSignalledOutputLength in the idle timer instead. 
                // This prevents the "double prompt" issue caused by input echoes.
                if (options.onOutput) options.onOutput(data);
            });

            pty.onExit(({ exitCode, signal }: { exitCode: number, signal: number }) => {
                console.log(`[ShellTool] [${callId}] Process exited with code ${exitCode} (signal: ${signal})`);
                setTimeout(() => childExit(), 200);
            });
        });
    }

    public writeStdin(callId: string, data: string): boolean {
        const pty = this.activeProcesses.get(callId);
        if (pty) {
            console.log(`[ShellTool] [${callId}] Writing to PTY stdin (length: ${data.length})`);
            pty.write(data);
            return true;
        }
        console.warn(`[ShellTool] [${callId}] No active process found for writeStdin. Map size: ${this.activeProcesses.size}`);
        return false;
    }
}
