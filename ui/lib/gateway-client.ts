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

type GatewayEventFrame = {
    type: 'event';
    event: string;
    payload?: any;
    seq?: number;
};

type GatewayResponseFrame = {
    type: 'res';
    id: string;
    ok: boolean;
    payload?: unknown;
    error?: { code?: string; message?: string; details?: unknown };
};

type GatewayRequestFrame = {
    type: 'req';
    id: string;
    method: string;
    params?: unknown;
};

function extractMessageText(message: any): string {
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object') {
        if (typeof message.text === 'string') return message.text;
        if (Array.isArray((message as any).content)) {
            const parts = (message as any).content
                .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item.text === 'string') return item.text;
                    return '';
                })
                .filter(Boolean);
            return parts.join('\n');
        }
    }
    return '';
}

class BrowserGatewayClient {
    private ws: WebSocket | null = null;
    private pending = new Map<string, { resolve: (v: unknown) => void; reject: (err: unknown) => void }>();
    private backoffMs = 800;
    private connectNonce: string | null = null;
    private connectTimer: number | null = null;
    private lastSeq: number | null = null;

    constructor(
        private opts: {
            url: string;
            token?: string;
            onEvent: (evt: GatewayEventFrame) => void;
            onStatus: (status: GatewayStatus, error?: string) => void;
            onClose?: (code: number, reason: string) => void;
            onError?: (err: unknown) => void;
            onGap?: (info: { expected: number; received: number }) => void;
        },
    ) { }

    get connected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    start() {
        this.connect();
    }

    stop() {
        this.ws?.close();
        this.ws = null;
        this.flushPending(new Error('gateway client stopped'));
        this.opts.onStatus('disconnected');
    }

    async request<T = unknown>(method: string, params?: unknown): Promise<T> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('gateway not connected');
        }
        const id = crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const frame: GatewayRequestFrame = { type: 'req', id, method, params };
        const promise = new Promise<T>((resolve, reject) => {
            this.pending.set(id, { resolve: (v) => resolve(v as T), reject });
        });
        this.ws.send(JSON.stringify(frame));
        return promise;
    }

    private connect() {
        this.ws = new WebSocket(this.opts.url);

        this.ws.addEventListener('open', () => {
            this.opts.onStatus('connected');
            this.queueConnect();
        });
        this.ws.addEventListener('message', (ev) => this.handleMessage(String(ev.data ?? '')));
        this.ws.addEventListener('close', (ev) => {
            this.ws = null;
            this.opts.onStatus('disconnected');
            this.flushPending(new Error(`gateway closed (${ev.code}): ${ev.reason || 'no reason'}`));
            this.opts.onClose?.(ev.code, ev.reason || '');
            this.scheduleReconnect();
        });
        this.ws.addEventListener('error', (err) => {
            this.opts.onStatus('error', String(err));
            this.opts.onError?.(err);
        });
    }

    private scheduleReconnect() {
        if (!this.opts.url) return;
        const delay = this.backoffMs;
        this.backoffMs = Math.min(this.backoffMs * 1.7, 15000);
        setTimeout(() => this.connect(), delay);
    }

    private flushPending(err: Error) {
        for (const [, p] of this.pending) {
            p.reject(err);
        }
        this.pending.clear();
    }

    private queueConnect() {
        this.connectNonce = null;
        if (this.connectTimer !== null) {
            clearTimeout(this.connectTimer);
        }
        this.connectTimer = window.setTimeout(() => {
            void this.sendConnect();
        }, 500);
    }

    private async sendConnect() {
        try {
            const params: any = {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                    id: 'powerdirector-web',
                    version: '1.1.0-beta1',
                    platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
                    mode: 'webchat',
                },
                role: 'operator',
                scopes: ['operator.admin', 'operator.approvals'],
                caps: [],
                auth: this.opts.token ? { token: this.opts.token } : undefined,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
                locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
            };
            if (this.connectNonce) {
                params.nonce = this.connectNonce;
            }
            await this.request('connect', params);
            this.backoffMs = 800;
        } catch (err) {
            this.opts.onStatus('error', err instanceof Error ? err.message : String(err));
            // Let the close handler trigger reconnect/backoff
            this.ws?.close(4008, 'connect failed');
        }
    }

    private handleMessage(raw: string) {
        let parsed: any;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return;
        }
        if (parsed?.type === 'event') {
            const evt = parsed as GatewayEventFrame;
            if (evt.event === 'connect.challenge') {
                const nonce = typeof evt?.payload?.nonce === 'string' ? evt.payload.nonce : null;
                if (nonce) {
                    this.connectNonce = nonce;
                    void this.sendConnect();
                }
                return;
            }
            const seq = typeof evt.seq === 'number' ? evt.seq : null;
            if (seq !== null) {
                if (this.lastSeq !== null && seq > this.lastSeq + 1) {
                    this.opts.onGap?.({ expected: this.lastSeq + 1, received: seq });
                }
                this.lastSeq = seq;
            }
            this.opts.onEvent(evt);
            return;
        }
        if (parsed?.type === 'res') {
            const res = parsed as GatewayResponseFrame;
            const pending = this.pending.get(res.id);
            if (!pending) return;
            this.pending.delete(res.id);
            if (res.ok) {
                pending.resolve(res.payload);
            } else {
                pending.reject(new Error(res.error?.message || 'request failed'));
            }
            return;
        }
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
                    useDefaultModelChain: metadata?.useDefaultModelChain === true,
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
                            const runSession = typeof data.sessionId === 'string' && data.sessionId.trim().length > 0
                                ? data.sessionId.trim()
                                : sessionId;
                            this.emit('runid', runId, runSession);
                        }

                        if (data.step) {
                            const stepSessionId = typeof data.step.sessionId === 'string' && data.step.sessionId.trim().length > 0
                                ? data.step.sessionId.trim()
                                : sessionId;
                            this.emit('message', {
                                ...data.step,
                                sessionId: stepSessionId
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
                            const responseSessionId = typeof data.sessionId === 'string' && data.sessionId.trim().length > 0
                                ? data.sessionId.trim()
                                : sessionId;
                            this.emit('message', {
                                role: 'assistant',
                                content: data.response,
                                timestamp: responseTimestamp,
                                sessionId: responseSessionId,
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
    private client: BrowserGatewayClient | null = null;
    private url: string;
    private token: string;

    constructor(url: string, token: string) {
        super({ mode: 'remote', url, token });
        this.url = url;
        this.token = token;
    }

    async connect(): Promise<void> {
        this.setStatus('connecting');
        this.client = new BrowserGatewayClient({
            url: this.url,
            token: this.token,
            onStatus: (status, error) => this.setStatus(status, error),
            onEvent: (evt) => this.handleGatewayEvent(evt),
            onClose: () => this.setStatus('disconnected'),
            onError: (err) => this.emit('error', err),
        });
        this.client.start();
    }

    disconnect(): void {
        this.client?.stop();
        this.client = null;
        this.setStatus('disconnected');
    }

    async abort(sessionId: string, runId?: string | null): Promise<boolean> {
        if (!this.client) return false;
        try {
            await this.client.request('chat.abort', { sessionKey: sessionId, runId: runId ?? undefined });
            return true;
        } catch {
            return false;
        }
    }

    async sendMessage(sessionId: string, content: any, metadata: any = {}): Promise<string | null> {
        if (!this.client || !this.client.connected) {
            throw new Error('Not connected to gateway');
        }
        const idempotencyKey = (metadata?.runId as string | undefined)?.trim() || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const messageText = typeof content === 'string' ? content : '';
        const params: Record<string, unknown> = {
            sessionKey: sessionId,
            message: messageText,
            attachments: metadata?.attachments,
            idempotencyKey,
        };
        if (typeof metadata?.reasoning === 'string') params.thinking = metadata.reasoning;
        await this.client.request('chat.send', params);
        // runId will arrive via chat events
        return null;
    }

    private handleGatewayEvent(evt: GatewayEventFrame) {
        if (evt.event !== 'chat') return;
        const payload = evt.payload || {};
        const sessionKey = payload.sessionKey || payload.sessionId;
        const runId = payload.runId;
        if (runId && sessionKey) {
            this.emit('runid', runId, sessionKey);
        }
        const text = extractMessageText(payload.message);
        const ts = Date.now();

        if (payload.state === 'delta') {
            if (!text) return;
            this.emit('message', {
                role: 'assistant',
                content: text,
                timestamp: ts,
                sessionId: sessionKey,
                metadata: { status: 'thinking', runId, sessionId: sessionKey, seq: payload.seq }
            });
        } else if (payload.state === 'final') {
            this.emit('message', {
                role: 'assistant',
                content: text,
                timestamp: ts,
                sessionId: sessionKey,
                metadata: { final: true, runId, sessionId: sessionKey }
            });
        } else if (payload.state === 'aborted') {
            this.emit('message', {
                role: 'assistant',
                content: text,
                timestamp: ts,
                sessionId: sessionKey,
                metadata: { aborted: true, runId, sessionId: sessionKey }
            });
        } else if (payload.state === 'error') {
            this.emit('message', {
                error: payload.errorMessage || 'chat error',
                sessionId: sessionKey,
                metadata: { runId, sessionId: sessionKey }
            });
        }
    }
}
