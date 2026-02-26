// @ts-nocheck
import http from 'node:http';
import { NodeInfo, NodeManager } from '../nodes/manager.ts';

export interface NodeHostServerOptions {
    enabled?: boolean;
    port?: number;
    authToken?: string;
}

export class NodeHostServer {
    private readonly options: Required<NodeHostServerOptions>;
    private readonly nodeManager: NodeManager;
    private server: http.Server | null = null;

    constructor(nodeManager: NodeManager, options: NodeHostServerOptions = {}) {
        this.nodeManager = nodeManager;
        this.options = {
            enabled: options.enabled ?? false,
            port: options.port ?? 18790,
            authToken: options.authToken || '',
        };
    }

    public async start(): Promise<void> {
        if (!this.options.enabled) {
            console.log('Node host server disabled by settings.');
            return;
        }
        if (this.server?.listening) return;

        this.server = http.createServer((req, res) => {
            this.handle(req, res).catch((error) => {
                console.error('Node host request error:', error);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                }
                res.end(JSON.stringify({ error: 'Internal node host error' }));
            });
        });

        await new Promise<void>((resolve, reject) => {
            const onListening = () => {
                this.server?.off('error', onError);
                console.log(`Node host server listening on 0.0.0.0:${this.options.port}`);
                resolve();
            };
            const onError = (err: NodeJS.ErrnoException) => {
                this.server?.off('listening', onListening);
                if (err.code === 'EADDRINUSE') {
                    console.warn(`Node host port ${this.options.port} already in use. Skipping startup.`);
                    this.server = null;
                    resolve();
                    return;
                }
                reject(err);
            };

            this.server?.once('listening', onListening);
            this.server?.once('error', onError);
            this.server?.listen(this.options.port, '0.0.0.0');
        });
    }

    public async stop(): Promise<void> {
        if (!this.server) return;
        await new Promise<void>((resolve) => this.server?.close(() => resolve()));
        this.server = null;
    }

    private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Node-Token');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (!this.authorized(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Unauthorized node host token.' }));
            return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (pathname === '/health' && req.method === 'GET') {
            const opts = this.nodeManager.getOptions();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                status: 'ok',
                enabled: this.nodeManager.isEnabled(),
                maxNodes: opts.maxNodes,
                heartbeatInterval: opts.heartbeatInterval,
                capabilityAllowlist: opts.capabilities
            }));
            return;
        }

        if (pathname === '/nodes' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(this.nodeManager.getNodes()));
            return;
        }

        if (pathname === '/register' && req.method === 'POST') {
            try {
                const body = await this.readJson(req);
                const node = this.parseNode(body, req);
                this.nodeManager.registerNode(node);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, nodeId: node.id }));
            } catch (error: any) {
                const message = typeof error?.message === 'string' ? error.message : 'Invalid node registration payload.';
                const status = /too large/i.test(message) ? 413 : 400;
                res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: message }));
            }
            return;
        }

        if (pathname === '/heartbeat' && req.method === 'POST') {
            try {
                const body = await this.readJson(req);
                const id = typeof body?.id === 'string' ? body.id : '';
                if (!id) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Missing id.' }));
                    return;
                }
                this.nodeManager.updateHeartbeat(id);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true }));
            } catch (error: any) {
                const message = typeof error?.message === 'string' ? error.message : 'Invalid heartbeat payload.';
                const status = /too large/i.test(message) ? 413 : 400;
                res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: message }));
            }
            return;
        }

        if (pathname === '/command' && req.method === 'POST') {
            try {
                const body = await this.readJson(req);
                const nodeId = typeof body?.nodeId === 'string' ? body.nodeId.trim() : '';
                const command = typeof body?.command === 'string' ? body.command.trim() : '';
                const timeoutMs = typeof body?.timeoutMs === 'number' ? body.timeoutMs : undefined;

                if (!nodeId || !command) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Missing nodeId or command.' }));
                    return;
                }

                const outcome = await this.nodeManager.sendCommand(nodeId, command, body?.payload, { timeoutMs });
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(outcome));
            } catch (error: any) {
                const message = typeof error?.message === 'string' ? error.message : 'Invalid command payload.';
                const status = /timed out/i.test(message) ? 504 : /too large/i.test(message) ? 413 : 400;
                res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: message }));
            }
            return;
        }

        if (pathname === '/commands/next' && req.method === 'GET') {
            const nodeId = (url.searchParams.get('nodeId') || '').trim();
            const waitMsRaw = url.searchParams.get('waitMs');
            const waitMs = waitMsRaw && Number.isFinite(Number(waitMsRaw))
                ? Number(waitMsRaw)
                : undefined;

            if (!nodeId) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Missing nodeId query parameter.' }));
                return;
            }

            try {
                const command = await this.nodeManager.waitForCommand(nodeId, waitMs);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ command }));
            } catch (error: any) {
                const message = typeof error?.message === 'string' ? error.message : 'Failed to fetch next command.';
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: message }));
            }
            return;
        }

        if (pathname === '/commands/result' && req.method === 'POST') {
            try {
                const body = await this.readJson(req);
                const nodeId = typeof body?.nodeId === 'string' ? body.nodeId.trim() : '';
                const commandId = typeof body?.commandId === 'string' ? body.commandId.trim() : '';
                const success = Boolean(body?.success);
                const errorMessage = typeof body?.error === 'string' ? body.error : undefined;

                if (!nodeId || !commandId) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Missing nodeId or commandId.' }));
                    return;
                }

                const outcome = this.nodeManager.submitCommandResult(
                    nodeId,
                    commandId,
                    success,
                    body?.result,
                    errorMessage
                );
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ acknowledged: true, outcome }));
            } catch (error: any) {
                const message = typeof error?.message === 'string' ? error.message : 'Invalid command result payload.';
                const status = /too large/i.test(message) ? 413 : 400;
                res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: message }));
            }
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }

    private authorized(req: http.IncomingMessage): boolean {
        if (!this.options.authToken) return true;
        const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
        const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : '';
        const headerToken = typeof req.headers['x-node-token'] === 'string'
            ? req.headers['x-node-token'].trim()
            : '';
        const token = bearerToken || headerToken;
        return token === this.options.authToken;
    }

    private async readJson(req: http.IncomingMessage, maxBytes: number = 1024 * 1024): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let size = 0;
            let body = '';
            req.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > maxBytes) {
                    reject(new Error('Body too large'));
                    req.destroy();
                    return;
                }
                body += chunk.toString('utf8');
            });
            req.on('end', () => {
                if (!body.trim()) {
                    resolve({});
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch {
                    reject(new Error('Invalid JSON'));
                }
            });
            req.on('error', reject);
        });
    }

    private parseNode(raw: any, req?: http.IncomingMessage): NodeInfo {
        if (!raw || typeof raw !== 'object') {
            throw new Error('Invalid payload');
        }

        const id = typeof raw.id === 'string' ? raw.id.trim() : '';
        const displayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
        const nameFromPayload = typeof raw.name === 'string' ? raw.name.trim() : '';
        const name = displayName || nameFromPayload;
        const platform = typeof raw.platform === 'string' ? raw.platform.trim().toLowerCase() : '';
        const validPlatforms = ['macos', 'ios', 'android', 'linux', 'windows'] as const;
        if (!id || !name || !validPlatforms.includes(platform as any)) {
            throw new Error('Invalid node payload: id/name/platform required.');
        }

        const capabilities = Array.isArray(raw.capabilities)
            ? raw.capabilities.filter((x: any) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean)
            : [];
        const commands = Array.isArray(raw.commands)
            ? raw.commands.filter((x: any) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean)
            : [];
        const permissions = Array.isArray(raw.permissions)
            ? raw.permissions.filter((x: any) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean)
            : [];
        const pathEnv = Array.isArray(raw.pathEnv)
            ? raw.pathEnv.filter((x: any) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean)
            : [];
        const forwarded = typeof req?.headers['x-forwarded-for'] === 'string'
            ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
            : '';
        const remoteIp = (typeof raw.remoteIp === 'string' && raw.remoteIp.trim())
            ? raw.remoteIp.trim()
            : (forwarded || undefined);

        return {
            id,
            name,
            displayName: displayName || name,
            platform: platform as NodeInfo['platform'],
            version: typeof raw.version === 'string' ? raw.version.trim() : '1.0.0',
            coreVersion: typeof raw.coreVersion === 'string' ? raw.coreVersion.trim() : undefined,
            uiVersion: typeof raw.uiVersion === 'string' ? raw.uiVersion.trim() : undefined,
            deviceFamily: typeof raw.deviceFamily === 'string' ? raw.deviceFamily.trim() : undefined,
            modelIdentifier: typeof raw.modelIdentifier === 'string' ? raw.modelIdentifier.trim() : undefined,
            remoteIp,
            capabilities,
            commands: commands.length > 0 ? commands : undefined,
            permissions: permissions.length > 0 ? permissions : undefined,
            pathEnv: pathEnv.length > 0 ? pathEnv : undefined,
            status: 'online',
            lastSeen: Date.now(),
            connectedAtMs: Date.now()
        };
    }
}
