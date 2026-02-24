// @ts-nocheck
export interface NodeInfo {
    id: string;
    name: string;
    displayName?: string;
    platform: 'macos' | 'ios' | 'android' | 'linux' | 'windows';
    version: string;
    coreVersion?: string;
    uiVersion?: string;
    deviceFamily?: string;
    modelIdentifier?: string;
    remoteIp?: string;
    capabilities: string[]; // e.g., ['camera', 'screen', 'notification']
    commands?: string[];
    permissions?: string[];
    pathEnv?: string[];
    status: 'online' | 'offline';
    lastSeen: number;
    connectedAtMs?: number;
}

export interface NodeCommand {
    id: string;
    nodeId: string;
    command: string;
    payload: any;
    createdAt: number;
    timeoutMs: number;
}

export interface NodeCommandResult {
    commandId: string;
    nodeId: string;
    success: boolean;
    result?: any;
    error?: string;
    completedAt: number;
}

export interface SendCommandOptions {
    timeoutMs?: number;
}

export interface NodeManagerOptions {
    enabled?: boolean;
    maxNodes?: number;
    heartbeatInterval?: number; // seconds
    capabilities?: string[];
}

interface InflightCommand {
    nodeId: string;
    resolve: (result: NodeCommandResult) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}

interface CommandWaiter {
    resolve: (command: NodeCommand | null) => void;
    timer: NodeJS.Timeout;
}

export class NodeManager {
    private nodes: Map<string, NodeInfo> = new Map();
    private readonly options: Required<NodeManagerOptions>;
    private pendingCommandsByNode: Map<string, NodeCommand[]> = new Map();
    private commandWaitersByNode: Map<string, CommandWaiter[]> = new Map();
    private inflightCommands: Map<string, InflightCommand> = new Map();

    constructor(options: NodeManagerOptions = {}) {
        this.options = {
            enabled: options.enabled ?? false,
            maxNodes: options.maxNodes ?? 10,
            heartbeatInterval: options.heartbeatInterval ?? 30,
            capabilities: Array.isArray(options.capabilities) ? options.capabilities.filter((x) => typeof x === 'string') : []
        };
    }

    public isEnabled(): boolean {
        return this.options.enabled;
    }

    public getOptions(): Required<NodeManagerOptions> {
        return { ...this.options };
    }

    registerNode(info: NodeInfo) {
        if (!this.options.enabled) {
            throw new Error('Node host is disabled by settings.');
        }

        const exists = this.nodes.has(info.id);
        if (!exists && this.nodes.size >= this.options.maxNodes) {
            throw new Error(`Max nodes reached (${this.options.maxNodes}).`);
        }

        if (this.options.capabilities.length > 0) {
            const invalid = info.capabilities.filter((cap) => !this.options.capabilities.includes(cap));
            if (invalid.length > 0) {
                throw new Error(`Node capabilities not allowed: ${invalid.join(', ')}`);
            }
        }

        const now = Date.now();
        const previous = this.nodes.get(info.id);
        const normalizedCapabilities = this.normalizeStringList(info.capabilities);
        const normalizedCommands = this.normalizeStringList(info.commands);
        const normalizedPermissions = this.normalizeStringList(info.permissions);
        const normalizedPathEnv = this.normalizeStringList(info.pathEnv);
        const displayName = this.pickDisplayName(info, previous);

        this.nodes.set(info.id, {
            ...previous,
            ...info,
            name: (typeof info.name === 'string' && info.name.trim()) || previous?.name || displayName || info.id,
            displayName,
            capabilities: normalizedCapabilities,
            commands: normalizedCommands.length > 0 ? normalizedCommands : undefined,
            permissions: normalizedPermissions.length > 0 ? normalizedPermissions : undefined,
            pathEnv: normalizedPathEnv.length > 0 ? normalizedPathEnv : undefined,
            status: 'online',
            lastSeen: now,
            connectedAtMs: previous?.connectedAtMs ?? info.connectedAtMs ?? now
        });
        this.ensureNodeMaps(info.id);
        console.log(`Node registered: ${info.name} (${info.platform})`);
    }

    updateHeartbeat(id: string) {
        this.markStaleNodes();
        const node = this.nodes.get(id);
        if (node) {
            node.lastSeen = Date.now();
            node.status = 'online';
            this.ensureNodeMaps(id);
        }
    }

    getNodes(): NodeInfo[] {
        this.markStaleNodes();
        return Array.from(this.nodes.values());
    }

    async sendCommand(
        nodeId: string,
        command: string,
        payload: any,
        options: SendCommandOptions = {}
    ): Promise<NodeCommandResult> {
        this.markStaleNodes();

        const node = this.nodes.get(nodeId);
        if (!node) throw new Error(`Node ${nodeId} is not registered.`);
        if (node.status === 'offline') throw new Error(`Node ${nodeId} is offline.`);

        const normalizedCommand = typeof command === 'string' ? command.trim() : '';
        if (!normalizedCommand) {
            throw new Error('Command is required.');
        }

        const timeoutMs = this.normalizeTimeoutMs(options.timeoutMs);
        const commandId = this.generateCommandId(nodeId);
        const queued: NodeCommand = {
            id: commandId,
            nodeId,
            command: normalizedCommand,
            payload,
            createdAt: Date.now(),
            timeoutMs
        };

        return new Promise<NodeCommandResult>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.inflightCommands.delete(commandId);
                this.removeQueuedCommand(nodeId, commandId);
                reject(new Error(`Node command "${normalizedCommand}" timed out after ${timeoutMs}ms.`));
            }, timeoutMs);

            this.inflightCommands.set(commandId, { nodeId, resolve, reject, timer });
            this.enqueueCommand(queued);
        });
    }

    async waitForCommand(nodeId: string, waitMs: number = 25000): Promise<NodeCommand | null> {
        this.markStaleNodes();
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} is not registered.`);
        }
        if (node.status === 'offline') {
            throw new Error(`Node ${nodeId} is offline.`);
        }

        this.updateHeartbeat(nodeId);
        const queue = this.getQueue(nodeId);
        if (queue.length > 0) {
            return queue.shift() || null;
        }

        const boundedWaitMs = this.normalizeWaitMs(waitMs);
        if (boundedWaitMs === 0) return null;

        return new Promise<NodeCommand | null>((resolve) => {
            const waiters = this.getWaiters(nodeId);
            let settled = false;
            let timer: NodeJS.Timeout | null = null;

            const waiter: CommandWaiter = {
                resolve: (next) => {
                    if (settled) return;
                    settled = true;
                    if (timer) clearTimeout(timer);
                    resolve(next);
                },
                timer: setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    this.removeWaiter(nodeId, waiter);
                    resolve(null);
                }, boundedWaitMs)
            };
            timer = waiter.timer;

            waiters.push(waiter);
        });
    }

    submitCommandResult(
        nodeId: string,
        commandId: string,
        success: boolean,
        result?: any,
        error?: string
    ): NodeCommandResult {
        this.markStaleNodes();
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} is not registered.`);
        }

        const inflight = this.inflightCommands.get(commandId);
        if (!inflight) {
            throw new Error(`Unknown command id: ${commandId}`);
        }
        if (inflight.nodeId !== nodeId) {
            throw new Error(`Command ${commandId} does not belong to node ${nodeId}.`);
        }

        clearTimeout(inflight.timer);
        this.inflightCommands.delete(commandId);

        const outcome: NodeCommandResult = {
            commandId,
            nodeId,
            success: Boolean(success),
            result,
            error: success ? undefined : (typeof error === 'string' && error.trim() ? error.trim() : 'Node reported command failure.'),
            completedAt: Date.now()
        };

        inflight.resolve(outcome);
        return outcome;
    }

    private markStaleNodes() {
        const now = Date.now();
        const offlineAfterMs = Math.max(5, this.options.heartbeatInterval) * 1000 * 2;
        for (const node of this.nodes.values()) {
            if (now - node.lastSeen > offlineAfterMs) {
                if (node.status !== 'offline') {
                    node.status = 'offline';
                    this.failNodeCommands(node.id, `Node ${node.id} went offline before command completion.`);
                }
            }
        }
    }

    private ensureNodeMaps(nodeId: string): void {
        if (!this.pendingCommandsByNode.has(nodeId)) {
            this.pendingCommandsByNode.set(nodeId, []);
        }
        if (!this.commandWaitersByNode.has(nodeId)) {
            this.commandWaitersByNode.set(nodeId, []);
        }
    }

    private getQueue(nodeId: string): NodeCommand[] {
        this.ensureNodeMaps(nodeId);
        return this.pendingCommandsByNode.get(nodeId)!;
    }

    private getWaiters(nodeId: string): CommandWaiter[] {
        this.ensureNodeMaps(nodeId);
        return this.commandWaitersByNode.get(nodeId)!;
    }

    private enqueueCommand(command: NodeCommand): void {
        const waiters = this.getWaiters(command.nodeId);
        const waiter = waiters.shift();
        if (waiter) {
            waiter.resolve(command);
            return;
        }
        this.getQueue(command.nodeId).push(command);
    }

    private removeWaiter(nodeId: string, waiter: CommandWaiter): void {
        const waiters = this.commandWaitersByNode.get(nodeId);
        if (!waiters || waiters.length === 0) return;
        const index = waiters.indexOf(waiter);
        if (index >= 0) {
            waiters.splice(index, 1);
        }
    }

    private failNodeCommands(nodeId: string, reason: string): void {
        const queue = this.pendingCommandsByNode.get(nodeId) || [];
        while (queue.length > 0) {
            const queued = queue.shift()!;
            const inflight = this.inflightCommands.get(queued.id);
            if (!inflight) continue;
            clearTimeout(inflight.timer);
            this.inflightCommands.delete(queued.id);
            inflight.reject(new Error(reason));
        }
    }

    private removeQueuedCommand(nodeId: string, commandId: string): void {
        const queue = this.pendingCommandsByNode.get(nodeId);
        if (!queue || queue.length === 0) return;
        const index = queue.findIndex((item) => item.id === commandId);
        if (index >= 0) {
            queue.splice(index, 1);
        }
    }

    private normalizeTimeoutMs(timeoutMs: number | undefined): number {
        const raw = typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) ? timeoutMs : 20000;
        return Math.min(120000, Math.max(1000, Math.round(raw)));
    }

    private normalizeWaitMs(waitMs: number | undefined): number {
        const raw = typeof waitMs === 'number' && Number.isFinite(waitMs) ? waitMs : 25000;
        return Math.min(60000, Math.max(0, Math.round(raw)));
    }

    private generateCommandId(nodeId: string): string {
        return `${nodeId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private normalizeStringList(values: string[] | undefined): string[] {
        if (!Array.isArray(values)) return [];
        const out = new Set<string>();
        for (const value of values) {
            if (typeof value !== 'string') continue;
            const trimmed = value.trim();
            if (!trimmed) continue;
            out.add(trimmed);
        }
        return [...out];
    }

    private pickDisplayName(info: NodeInfo, previous?: NodeInfo): string {
        const candidates = [info.displayName, info.name, previous?.displayName, previous?.name, info.id];
        for (const candidate of candidates) {
            if (typeof candidate !== 'string') continue;
            const trimmed = candidate.trim();
            if (trimmed) return trimmed;
        }
        return info.id;
    }
}
