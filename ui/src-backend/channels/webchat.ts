// @ts-nocheck
import { Channel, ChannelMessage } from './base';
import http from 'node:http';

interface WebChatClient {
    id: string;
    res: http.ServerResponse;
}

export class WebChatChannel implements Channel {
    public id = 'webchat';
    public name = 'webchat';
    public type: 'web' = 'web';
    private port: number;
    private server: http.Server | null = null;
    private clients: Map<string, WebChatClient> = new Map();
    private messageHandler?: (msg: ChannelMessage) => void;

    constructor(port: number = 3100) {
        this.port = port;
    }

    async start(): Promise<void> {
        if (this.server?.listening) return;

        this.server = http.createServer((req, res) => {
            // CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            const url = new URL(req.url || '/', `http://localhost:${this.port}`);

            // SSE endpoint for receiving messages
            if (url.pathname === '/events' && req.method === 'GET') {
                const clientId = url.searchParams.get('clientId') || `web-${Date.now()}`;
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });
                this.clients.set(clientId, { id: clientId, res });
                req.on('close', () => this.clients.delete(clientId));
                return;
            }

            // POST endpoint for sending messages
            if (url.pathname === '/message' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        if (this.messageHandler) {
                            this.messageHandler({
                                id: `web-${Date.now()}`,
                                channelId: this.id,
                                content: data.message,
                                senderId: data.clientId || 'anonymous',
                                replyToId: data.clientId || 'anonymous',
                                timestamp: Date.now(),
                                metadata: { source: 'webchat' }
                            });
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (e) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid JSON' }));
                    }
                });
                return;
            }

            // Health check
            if (url.pathname === '/health') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok', clients: this.clients.size }));
                return;
            }

            res.writeHead(404);
            res.end('Not found');
        });

        await new Promise<void>((resolve, reject) => {
            const onListening = () => {
                this.server?.off('error', onError);
                console.log(`WebChat channel listening on port ${this.port}`);
                resolve();
            };

            const onError = (err: NodeJS.ErrnoException) => {
                this.server?.off('listening', onListening);
                if (err.code === 'EADDRINUSE') {
                    console.warn(`WebChat port ${this.port} already in use. Skipping this channel instance.`);
                    this.server = null;
                    resolve();
                    return;
                }
                reject(err);
            };

            this.server?.once('listening', onListening);
            this.server?.once('error', onError);
            this.server?.listen(this.port);
        });
    }

    async stop(): Promise<void> {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    async send(clientId: string, content: string | any): Promise<void> {
        const message = typeof content === 'string' ? content : JSON.stringify(content);
        const client = this.clients.get(clientId);
        if (client) {
            client.res.write(`data: ${JSON.stringify({ message })}\n\n`);
        } else {
            // Broadcast to all clients
            for (const [, c] of this.clients) {
                c.res.write(`data: ${JSON.stringify({ message })}\n\n`);
            }
        }
    }

    onMessage(handler: (msg: ChannelMessage) => void): void {
        this.messageHandler = handler;
    }

    getStatus() {
        return {
            connected: this.server?.listening || false,
            running: !!this.server
        };
    }

    async probe() {
        if (!this.server) return { ok: false, error: 'Server not initialized' };
        return { ok: true };
    }
}
