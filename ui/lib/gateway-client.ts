import { EventEmitter } from 'events';

export interface GatewayMessage {
    role: 'user' | 'assistant' | 'system';
    content: any;
    timestamp: number;
    sessionId?: string;
    agentId?: string;
    metadata?: Record<string, any>;
}

export type GatewayStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
export type GatewayMode = 'local' | 'remote';

export interface GatewayConfig {
    url?: string;
    token?: string;
    mode: GatewayMode;
}

export abstract class GatewayClient extends EventEmitter {
    protected status: GatewayStatus = 'disconnected';

    constructor(protected config: GatewayConfig) {
        super();
    }

    abstract connect(): Promise<void>;
    abstract disconnect(): void;

    /**
     * Send a message and return a runId if the backend supports server-side abort.
     */
    abstract sendMessage(sessionId: string, content: any, metadata?: any): Promise<string | null>;

    /**
     */
    abstract abort(sessionId: string, runId?: string | null): Promise<boolean>;

    getStatus(): GatewayStatus {
        return this.status;
    }

    protected setStatus(status: GatewayStatus, error?: string) {
        this.status = status;
        this.emit('status', status, error);
    }
}

/**
 * LocalClient: Wraps the internal Next.js API routes.
 * Simulates a persistent connection but effectively just makes HTTP requests.
 */
export class LocalClient extends GatewayClient {
    constructor() {
        super({ mode: 'local' });
    }

    async connect(): Promise<void> {
        // Local is always "connected" conceptually as the server is same-origin
        this.setStatus('connected');
        return Promise.resolve();
    }

    disconnect(): void {
        this.setStatus('disconnected');
    }

    async abort(sessionId: string, runId?: string | null): Promise<boolean> {
        try {
            const res = await fetch('/api/chat/abort', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, runId: runId || undefined })
            });
            if (!res.ok) return false;
            const data = await res.json().catch(() => ({}));
            return data?.ok === true;
        } catch {
            return false;
        }
    }

    async sendMessage(sessionId: string, content: any, metadata: any = {}): Promise<string | null> {
        const formatServerError = (data: any): string => {
            const base = typeof data?.error === 'string' && data.error.trim().length > 0
                ? data.error.trim()
                : 'Unknown chat error';

            const detailLines: string[] = [];
            if (typeof data?.code === 'string' && data.code.trim().length > 0) {
                detailLines.push(`Code: ${data.code.trim()}`);
            }

            if (typeof data?.details === 'string' && data.details.trim().length > 0) {
                detailLines.push(data.details.trim());
            } else if (Array.isArray(data?.failures)) {
                for (const failure of data.failures) {
                    if (!failure) continue;
                    const provider = typeof failure.provider === 'string' && failure.provider.trim().length > 0
                        ? failure.provider.trim()
                        : 'provider';
                    const code = typeof failure.code === 'string' && failure.code.trim().length > 0
                        ? `[${failure.code.trim()}] `
                        : '';
                    const message = typeof failure.message === 'string' && failure.message.trim().length > 0
                        ? failure.message.trim()
                        : 'Unknown failure';
                    detailLines.push(`${provider}: ${code}${message}`);
                }
            }

            return detailLines.length > 0
                ? `${base}\n${detailLines.join('\n')}`
                : base;
        };

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    message: content,
                    continue: metadata?.continue,
                    provider: metadata?.provider,
                    model: metadata?.model,
                    reasoning: metadata?.reasoning,
                    attachments: metadata?.attachments,
                    agentId: metadata?.agentId,
                    runId: metadata?.runId
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(errData.error || `Local API Error: ${res.statusText}`);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error('Failed to get response reader');

            const decoder = new TextDecoder();
            let buffer = '';

            let runId: string | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    // SSE heartbeats / comments start with ':' and must be ignored.
                    if (line.startsWith(':')) continue;

                    // Some servers may emit "data:" (no space). Handle both.
                    if (line.startsWith('data:')) {
                        const jsonStr = line.replace(/^data:\s?/, '').trim();
                        if (!jsonStr) continue;

                        let data: any;
                        try {
                            data = JSON.parse(jsonStr);
                        } catch (e) {
                            console.error('Failed to parse SSE chunk', e, { jsonStr });
                            continue;
                        }

                        if (typeof data?.runId === 'string' && data.runId.trim().length > 0) {
                            runId = data.runId.trim();
                            this.emit('runid', runId, sessionId);
                        }

                        if (data.step) {
                            this.emit('message', {
                                ...data.step,
                                sessionId
                            });
                        } else if (data.response) {
                            const responseTimestamp = typeof data.responseTimestamp === 'number' && Number.isFinite(data.responseTimestamp)
                                ? data.responseTimestamp
                                : Date.now();
                            const responseMetaBase = data.responseMeta && typeof data.responseMeta === 'object' && !Array.isArray(data.responseMeta)
                                ? data.responseMeta
                                : {};
                            const responseMeta = {
                                ...responseMetaBase,
                                final: true
                            };
                            this.emit('message', {
                                role: 'assistant',
                                content: data.response,
                                timestamp: responseTimestamp,
                                sessionId,
                                metadata: responseMeta
                            });
                        } else if (data.error) {
                            const formatted = formatServerError(data);
                            this.emit('message', { error: formatted, details: data.details, failures: Array.isArray(data.failures) ? data.failures : undefined, sessionId });
                            throw new Error(formatted);
                        }
                    }
                }
            }

            return runId;
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }
}

/**
 * RemoteClient: Connects to an PowerDirector Gateway via WebSocket.
 */
export class RemoteClient extends GatewayClient {
    private ws: WebSocket | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor(url: string, private token: string) {
        super({ mode: 'remote', url, token });
    }

    async connect(): Promise<void> {
        if (this.ws) {
            this.ws.close();
        }

        this.setStatus('connecting');

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.url!);

                this.ws.onopen = () => {
                    this.authenticate();
                    this.setStatus('connected');
                    resolve();
                };

                this.ws.onclose = () => {
                    this.setStatus('disconnected');
                    this.ws = null;
                    // Auto-reconnect logic could go here
                };

                this.ws.onerror = (err) => {
                    console.error('WebSocket Error:', err);
                    this.setStatus('error', 'Connection failed');
                    // Only reject if we are currently trying to connect
                    if (this.status === 'connecting') {
                        reject(err);
                    }
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleIncomingMessage(data);
                    } catch (e) {
                        console.error('Failed to parse incoming message:', e);
                    }
                };

            } catch (err) {
                this.setStatus('error', String(err));
                reject(err);
            }
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.setStatus('disconnected');
    }

    private authenticate() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'auth',
                token: this.token
            }));
        }
    }

    async abort(_sessionId: string, runId?: string | null): Promise<boolean> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            this.ws.send(JSON.stringify({ type: 'chat.abort', runId: runId || undefined }));
            return true;
        } catch {
            return false;
        }
    }

    async sendMessage(sessionId: string, content: any, metadata: any = {}): Promise<string | null> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected to gateway');
        }

        const payload = {
            type: 'message',
            sessionId,
            content, // PowerDirector gateway expects content at top level or nested?
            // Standard PowerDirector protocol usually wraps it.
            // Based on 'Gateway Access' screenshot, it connects to standard gateway.
            // We will interpret a standard structure.
            ...metadata
        };

        this.ws.send(JSON.stringify(payload));
        return null;
    }

    private handleIncomingMessage(data: any) {
        // Transform remote message format to internal GatewayMessage format
        // This mapping depends on actual PowerDirector Gateway protocol.
        // Assuming standard format matches what we need for now.

        if (data.type === 'message' || data.response) {
            this.emit('message', {
                role: 'assistant',
                content: data.content || data.response,
                timestamp: Date.now(),
                sessionId: data.sessionId,
                agentId: data.agentId
            });
        }
    }
}
