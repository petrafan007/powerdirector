// @ts-nocheck
import { spawn, type ChildProcessWithoutNullStreams, execFile } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import { promisify } from 'node:util';
import { Channel, ChannelMessage } from './base.ts';

const execFileAsync = promisify(execFile);

interface IMessageAttachment {
    original_path?: string | null;
    mime_type?: string | null;
    missing?: boolean | null;
}

interface IMessagePayload {
    id?: number | null;
    chat_id?: number | null;
    sender?: string | null;
    is_from_me?: boolean | null;
    text?: string | null;
    reply_to_id?: number | string | null;
    reply_to_text?: string | null;
    reply_to_sender?: string | null;
    created_at?: string | null;
    attachments?: IMessageAttachment[] | null;
    chat_identifier?: string | null;
    chat_guid?: string | null;
    chat_name?: string | null;
    participants?: string[] | null;
    is_group?: boolean | null;
}

interface RpcNotification {
    method: string;
    params?: unknown;
}

interface RpcResponse<T = unknown> {
    id?: string | number | null;
    result?: T;
    error?: {
        code?: number;
        message?: string;
        data?: unknown;
    };
    method?: string;
    params?: unknown;
}

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer?: NodeJS.Timeout;
}

interface ImsgRpcClientOptions {
    cliPath: string;
    dbPath?: string;
    onNotification?: (notification: RpcNotification) => void;
}

class ImsgRpcClient {
    private child: ChildProcessWithoutNullStreams | null = null;
    private reader: Interface | null = null;
    private pending = new Map<string, PendingRequest>();
    private nextId = 1;
    private closed: Promise<void>;
    private resolveClosed: (() => void) | null = null;
    private readonly cliPath: string;
    private readonly dbPath?: string;
    private readonly onNotification?: (notification: RpcNotification) => void;

    constructor(options: ImsgRpcClientOptions) {
        this.cliPath = options.cliPath;
        this.dbPath = options.dbPath;
        this.onNotification = options.onNotification;
        this.closed = new Promise((resolve) => {
            this.resolveClosed = resolve;
        });
    }

    public async start(): Promise<void> {
        if (this.child) return;

        const args = ['rpc'];
        if (typeof this.dbPath === 'string' && this.dbPath.trim().length > 0) {
            args.push('--db', this.dbPath.trim());
        }

        const child = spawn(this.cliPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env
        });
        this.child = child;

        this.reader = createInterface({ input: child.stdout });
        this.reader.on('line', (line) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            this.handleLine(trimmed);
        });

        child.stderr.on('data', () => {
            // stderr is handled via request/close failures; avoid noisy logs by default.
        });

        child.on('error', (error) => {
            const err = error instanceof Error ? error : new Error(String(error));
            this.failAll(err);
            this.resolveClosed?.();
        });

        child.on('close', (code, signal) => {
            const reason = signal ? `signal ${signal}` : `code ${String(code ?? 'unknown')}`;
            this.failAll(new Error(`imsg rpc exited (${reason})`));
            this.resolveClosed?.();
        });
    }

    public async stop(): Promise<void> {
        if (!this.child) return;

        this.reader?.close();
        this.reader = null;
        const child = this.child;
        this.child = null;

        try {
            child.stdin.end();
        } catch {
            // ignore
        }

        await Promise.race([
            this.closed,
            new Promise<void>((resolve) => {
                setTimeout(() => {
                    try {
                        if (!child.killed) child.kill('SIGTERM');
                    } catch {
                        // ignore
                    }
                    resolve();
                }, 500);
            })
        ]);
    }

    public async request<T = unknown>(
        method: string,
        params: Record<string, unknown> = {},
        timeoutMs: number = 10000
    ): Promise<T> {
        if (!this.child || !this.child.stdin) {
            throw new Error('imsg rpc not running');
        }

        const id = this.nextId++;
        const idKey = String(id);

        const responsePromise = new Promise<T>((resolve, reject) => {
            const timer = timeoutMs > 0
                ? setTimeout(() => {
                    this.pending.delete(idKey);
                    reject(new Error(`imsg rpc timeout (${method})`));
                }, timeoutMs)
                : undefined;

            this.pending.set(idKey, {
                resolve: (value) => resolve(value as T),
                reject,
                timer
            });
        });

        const payload = {
            jsonrpc: '2.0',
            id,
            method,
            params
        };
        this.child.stdin.write(`${JSON.stringify(payload)}\n`);
        return await responsePromise;
    }

    private handleLine(line: string): void {
        let parsed: RpcResponse;
        try {
            parsed = JSON.parse(line) as RpcResponse;
        } catch {
            return;
        }

        if (parsed.id !== undefined && parsed.id !== null) {
            const key = String(parsed.id);
            const pending = this.pending.get(key);
            if (!pending) return;

            if (pending.timer) clearTimeout(pending.timer);
            this.pending.delete(key);

            if (parsed.error) {
                const message = parsed.error.message || 'imsg rpc error';
                const detail = parsed.error.data === undefined
                    ? ''
                    : ` ${typeof parsed.error.data === 'string' ? parsed.error.data : JSON.stringify(parsed.error.data)}`;
                pending.reject(new Error(`${message}${detail}`.trim()));
                return;
            }

            pending.resolve(parsed.result);
            return;
        }

        if (typeof parsed.method === 'string') {
            this.onNotification?.({
                method: parsed.method,
                params: parsed.params
            });
        }
    }

    private failAll(error: Error): void {
        for (const [key, pending] of this.pending.entries()) {
            if (pending.timer) clearTimeout(pending.timer);
            pending.reject(error);
            this.pending.delete(key);
        }
    }
}

export interface IMessageChannelConfig {
    cliPath?: string;
    dbPath?: string;
    includeAttachments?: boolean;
    probeTimeoutMs?: number;
    requestTimeoutMs?: number;
    service?: IMessageService;
    region?: string;
}

export type IMessageService = 'imessage' | 'sms' | 'auto';

export type IMessageTarget =
    | { kind: 'chat_id'; chatId: number }
    | { kind: 'chat_guid'; chatGuid: string }
    | { kind: 'chat_identifier'; chatIdentifier: string }
    | { kind: 'handle'; to: string; service: IMessageService };

const CHAT_ID_PREFIXES = ['chat_id:', 'chatid:', 'chat:'];
const CHAT_GUID_PREFIXES = ['chat_guid:', 'chatguid:', 'guid:'];
const CHAT_IDENTIFIER_PREFIXES = ['chat_identifier:', 'chatidentifier:', 'chatident:'];
const SERVICE_PREFIXES: Array<{ prefix: string; service: IMessageService }> = [
    { prefix: 'imessage:', service: 'imessage' },
    { prefix: 'sms:', service: 'sms' },
    { prefix: 'auto:', service: 'auto' }
];

function normalizeE164(number: string): string {
    const withoutPrefix = number.trim();
    const digits = withoutPrefix.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) {
        return `+${digits.slice(1)}`;
    }
    return `+${digits}`;
}

function isChatTargetPrefix(lower: string): boolean {
    for (const prefix of CHAT_ID_PREFIXES) {
        if (lower.startsWith(prefix)) return true;
    }
    for (const prefix of CHAT_GUID_PREFIXES) {
        if (lower.startsWith(prefix)) return true;
    }
    for (const prefix of CHAT_IDENTIFIER_PREFIXES) {
        if (lower.startsWith(prefix)) return true;
    }
    return false;
}

function parseChatTarget(trimmed: string, lower: string): IMessageTarget | null {
    for (const prefix of CHAT_ID_PREFIXES) {
        if (!lower.startsWith(prefix)) continue;
        const value = trimmed.slice(prefix.length).trim();
        const chatId = Number.parseInt(value, 10);
        if (!Number.isFinite(chatId)) {
            throw new Error(`Invalid chat_id: ${value}`);
        }
        return { kind: 'chat_id', chatId };
    }

    for (const prefix of CHAT_GUID_PREFIXES) {
        if (!lower.startsWith(prefix)) continue;
        const value = trimmed.slice(prefix.length).trim();
        if (!value) {
            throw new Error('chat_guid is required');
        }
        return { kind: 'chat_guid', chatGuid: value };
    }

    for (const prefix of CHAT_IDENTIFIER_PREFIXES) {
        if (!lower.startsWith(prefix)) continue;
        const value = trimmed.slice(prefix.length).trim();
        if (!value) {
            throw new Error('chat_identifier is required');
        }
        return { kind: 'chat_identifier', chatIdentifier: value };
    }

    return null;
}

export function normalizeIMessageHandle(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';

    const lowered = trimmed.toLowerCase();
    if (lowered.startsWith('imessage:')) {
        return normalizeIMessageHandle(trimmed.slice('imessage:'.length));
    }
    if (lowered.startsWith('sms:')) {
        return normalizeIMessageHandle(trimmed.slice('sms:'.length));
    }
    if (lowered.startsWith('auto:')) {
        return normalizeIMessageHandle(trimmed.slice('auto:'.length));
    }

    for (const prefix of CHAT_ID_PREFIXES) {
        if (lowered.startsWith(prefix)) {
            const value = trimmed.slice(prefix.length).trim();
            return `chat_id:${value}`;
        }
    }
    for (const prefix of CHAT_GUID_PREFIXES) {
        if (lowered.startsWith(prefix)) {
            const value = trimmed.slice(prefix.length).trim();
            return `chat_guid:${value}`;
        }
    }
    for (const prefix of CHAT_IDENTIFIER_PREFIXES) {
        if (lowered.startsWith(prefix)) {
            const value = trimmed.slice(prefix.length).trim();
            return `chat_identifier:${value}`;
        }
    }

    if (trimmed.includes('@')) {
        return trimmed.toLowerCase();
    }
    const normalized = normalizeE164(trimmed);
    if (normalized && normalized !== '+') {
        return normalized;
    }
    return trimmed.replace(/\s+/g, '');
}

export function parseIMessageTarget(target: string): IMessageTarget {
    const trimmed = String(target || '').trim();
    if (!trimmed) {
        throw new Error('iMessage target is required');
    }
    const lower = trimmed.toLowerCase();

    for (const { prefix, service } of SERVICE_PREFIXES) {
        if (!lower.startsWith(prefix)) continue;
        const remainder = trimmed.slice(prefix.length).trim();
        if (!remainder) {
            throw new Error(`${prefix} target is required`);
        }
        const remainderLower = remainder.toLowerCase();
        if (isChatTargetPrefix(remainderLower)) {
            return parseIMessageTarget(remainder);
        }
        return { kind: 'handle', to: normalizeIMessageHandle(remainder), service };
    }

    const chatTarget = parseChatTarget(trimmed, lower);
    if (chatTarget) return chatTarget;

    return { kind: 'handle', to: normalizeIMessageHandle(trimmed), service: 'auto' };
}

function toTargetParams(target: IMessageTarget): Record<string, unknown> {
    if (target.kind === 'chat_id') {
        return { chat_id: target.chatId };
    }
    if (target.kind === 'chat_guid') {
        return { chat_guid: target.chatGuid };
    }
    if (target.kind === 'chat_identifier') {
        return { chat_identifier: target.chatIdentifier };
    }
    return { to: target.to };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || typeof value === 'string';
}

function isOptionalStringOrNumber(value: unknown): value is string | number | null | undefined {
    return (
        value === undefined
        || value === null
        || typeof value === 'string'
        || typeof value === 'number'
    );
}

function isOptionalNumber(value: unknown): value is number | null | undefined {
    return value === undefined || value === null || typeof value === 'number';
}

function isOptionalBoolean(value: unknown): value is boolean | null | undefined {
    return value === undefined || value === null || typeof value === 'boolean';
}

function isOptionalStringArray(value: unknown): value is string[] | null | undefined {
    return (
        value === undefined
        || value === null
        || (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))
    );
}

function isOptionalAttachments(value: unknown): value is IMessagePayload['attachments'] {
    if (value === undefined || value === null) return true;
    if (!Array.isArray(value)) return false;

    return value.every((entry) => {
        if (!isRecord(entry)) return false;
        return (
            isOptionalString(entry.original_path)
            && isOptionalString(entry.mime_type)
            && isOptionalBoolean(entry.missing)
        );
    });
}

export class IMessageChannel implements Channel {
    public id = 'imessage';
    public name = 'iMessage';
    public type: 'messaging' = 'messaging';

    private readonly config: Required<IMessageChannelConfig>;
    private messageHandler?: (msg: ChannelMessage) => void;
    private rpcClient: ImsgRpcClient | null = null;
    private subscriptionId: number | null = null;
    private connected = false;
    private running = false;
    private lastError?: string;

    constructor(config: IMessageChannelConfig = {}) {
        this.config = {
            cliPath: (config.cliPath || 'imsg').trim() || 'imsg',
            dbPath: config.dbPath?.trim() || '',
            includeAttachments: config.includeAttachments === true,
            probeTimeoutMs: Number.isFinite(config.probeTimeoutMs) ? Math.max(1000, Number(config.probeTimeoutMs)) : 10000,
            requestTimeoutMs: Number.isFinite(config.requestTimeoutMs) ? Math.max(1000, Number(config.requestTimeoutMs)) : 10000,
            service: config.service || 'auto',
            region: (config.region || 'US').trim() || 'US'
        };
    }

    public async start(): Promise<void> {
        this.running = true;
        this.lastError = undefined;

        const probe = await this.probe();
        if (!probe.ok) {
            this.connected = false;
            this.lastError = probe.error;
            this.running = false;
            throw new Error(probe.error || 'iMessage probe failed');
        }

        this.rpcClient = new ImsgRpcClient({
            cliPath: this.config.cliPath,
            dbPath: this.config.dbPath || undefined,
            onNotification: (notification) => {
                if (notification.method === 'message') {
                    this.handleInboundNotification(notification.params);
                } else if (notification.method === 'error') {
                    this.lastError = `imsg watch error: ${JSON.stringify(notification.params)}`;
                }
            }
        });

        try {
            await this.rpcClient.start();
            await this.rpcClient.request('chats.list', { limit: 1 }, this.config.requestTimeoutMs);
            const subscribed = await this.rpcClient.request<{ subscription?: number }>(
                'watch.subscribe',
                { attachments: this.config.includeAttachments },
                this.config.requestTimeoutMs
            );
            this.subscriptionId = typeof subscribed?.subscription === 'number' ? subscribed.subscription : null;
            this.connected = true;
        } catch (error: any) {
            this.connected = false;
            this.lastError = error.message || String(error);
            this.running = false;
            await this.rpcClient?.stop();
            this.rpcClient = null;
            throw error;
        }
    }

    public async stop(): Promise<void> {
        this.running = false;
        this.connected = false;

        if (this.rpcClient && this.subscriptionId !== null) {
            try {
                await this.rpcClient.request(
                    'watch.unsubscribe',
                    { subscription: this.subscriptionId },
                    this.config.requestTimeoutMs
                );
            } catch {
                // ignore unsubscribe failures during shutdown
            }
        }
        this.subscriptionId = null;

        await this.rpcClient?.stop();
        this.rpcClient = null;
    }

    public async send(target: string, content: string | any): Promise<void> {
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        if (!text.trim()) {
            throw new Error('iMessage send requires non-empty content.');
        }

        const resolvedTarget = parseIMessageTarget(target);
        const targetParams = toTargetParams(resolvedTarget);
        const params: Record<string, unknown> = {
            text,
            service: resolvedTarget.kind === 'handle' ? resolvedTarget.service : this.config.service,
            region: this.config.region,
            ...targetParams
        };

        if (this.rpcClient) {
            await this.rpcClient.request('send', params, this.config.requestTimeoutMs);
            return;
        }

        const client = new ImsgRpcClient({
            cliPath: this.config.cliPath,
            dbPath: this.config.dbPath || undefined
        });
        try {
            await client.start();
            await client.request('send', params, this.config.requestTimeoutMs);
        } finally {
            await client.stop();
        }
    }

    public onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    public getStatus(): { connected: boolean; running: boolean; error?: string } {
        return {
            connected: this.connected,
            running: this.running,
            error: this.lastError
        };
    }

    public async probe(): Promise<{ ok: boolean; error?: string }> {
        try {
            await execFileAsync(this.config.cliPath, ['--version'], {
                timeout: this.config.probeTimeoutMs
            });
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                return { ok: false, error: `imsg not found (${this.config.cliPath})` };
            }
            return { ok: false, error: `imsg probe failed: ${error.message || String(error)}` };
        }

        try {
            const help = await execFileAsync(this.config.cliPath, ['rpc', '--help'], {
                timeout: this.config.probeTimeoutMs
            });
            const combined = `${help.stdout || ''}\n${help.stderr || ''}`.toLowerCase();
            if (combined.includes('unknown command') && combined.includes('rpc')) {
                return { ok: false, error: 'imsg CLI does not support the "rpc" subcommand (update imsg)' };
            }
        } catch (error: any) {
            return { ok: false, error: `imsg rpc --help failed: ${error.message || String(error)}` };
        }

        const client = new ImsgRpcClient({
            cliPath: this.config.cliPath,
            dbPath: this.config.dbPath || undefined
        });
        try {
            await client.start();
            await client.request('chats.list', { limit: 1 }, this.config.probeTimeoutMs);
            return { ok: true };
        } catch (error: any) {
            return { ok: false, error: `imsg rpc unavailable: ${error.message || String(error)}` };
        } finally {
            await client.stop();
        }
    }

    private handleInboundNotification(raw: unknown): void {
        const payload = this.parsePayload(raw);
        if (!payload) return;
        if (payload.is_from_me === true) return;
        if (!this.messageHandler) return;

        const sender = typeof payload.sender === 'string' && payload.sender.trim().length > 0
            ? payload.sender.trim()
            : 'unknown';
        const text = typeof payload.text === 'string' ? payload.text.trim() : '';
        const attachmentCount = Array.isArray(payload.attachments) ? payload.attachments.length : 0;
        const content = text || (attachmentCount > 0 ? '<media:attachment>' : '');
        if (!content) return;

        let timestamp = Date.now();
        if (typeof payload.created_at === 'string' && payload.created_at.trim().length > 0) {
            const parsed = Date.parse(payload.created_at);
            if (Number.isFinite(parsed)) timestamp = parsed;
        }

        const isGroup = payload.is_group === true;
        const replyToId = this.resolveReplyTarget(payload, sender);
        const id = payload.id !== null && payload.id !== undefined
            ? String(payload.id)
            : `${timestamp}-${sender}`;

        this.messageHandler({
            id,
            channelId: this.id,
            content,
            senderId: sender,
            replyToId,
            timestamp,
            metadata: {
                chatId: payload.chat_id ?? undefined,
                chatGuid: payload.chat_guid ?? undefined,
                chatIdentifier: payload.chat_identifier ?? undefined,
                chatName: payload.chat_name ?? undefined,
                participants: payload.participants ?? undefined,
                isGroup,
                attachments: payload.attachments ?? []
            }
        });
    }

    private resolveReplyTarget(payload: IMessagePayload, sender: string): string {
        if (typeof payload.chat_id === 'number' && Number.isFinite(payload.chat_id)) {
            return `chat_id:${payload.chat_id}`;
        }
        if (typeof payload.chat_guid === 'string' && payload.chat_guid.trim().length > 0) {
            return `chat_guid:${payload.chat_guid.trim()}`;
        }
        if (typeof payload.chat_identifier === 'string' && payload.chat_identifier.trim().length > 0) {
            return `chat_identifier:${payload.chat_identifier.trim()}`;
        }
        return sender;
    }

    private parsePayload(raw: unknown): IMessagePayload | null {
        if (!isRecord(raw)) return null;

        const message = isRecord(raw.message) ? raw.message : raw;
        if (!isRecord(message)) return null;

        const candidate = message as IMessagePayload;
        if (
            !isOptionalNumber(candidate.id)
            || !isOptionalNumber(candidate.chat_id)
            || !isOptionalString(candidate.sender)
            || !isOptionalBoolean(candidate.is_from_me)
            || !isOptionalString(candidate.text)
            || !isOptionalStringOrNumber(candidate.reply_to_id)
            || !isOptionalString(candidate.reply_to_text)
            || !isOptionalString(candidate.reply_to_sender)
            || !isOptionalString(candidate.created_at)
            || !isOptionalAttachments(candidate.attachments)
            || !isOptionalString(candidate.chat_identifier)
            || !isOptionalString(candidate.chat_guid)
            || !isOptionalString(candidate.chat_name)
            || !isOptionalStringArray(candidate.participants)
            || !isOptionalBoolean(candidate.is_group)
        ) {
            return null;
        }

        return candidate;
    }
}
