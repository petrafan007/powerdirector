// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

export interface WebRuntimeOptions {
    enabled?: boolean;
    port?: number;
    corsOrigins?: string[];
    rateLimiting?: {
        enabled?: boolean;
        maxPerMinute?: number;
    };
    staticDir?: string;
}

interface RateWindow {
    minuteStart: number;
    count: number;
}

export class WebRuntimeServer {
    private readonly options: Required<WebRuntimeOptions>;
    private readonly rateWindows: Map<string, RateWindow> = new Map();
    private server: http.Server | null = null;

    constructor(options: WebRuntimeOptions = {}) {
        this.options = {
            enabled: options.enabled ?? true,
            port: options.port ?? 3000,
            corsOrigins: Array.isArray(options.corsOrigins) ? options.corsOrigins.filter((x) => typeof x === 'string') : [],
            rateLimiting: {
                enabled: options.rateLimiting?.enabled ?? false,
                maxPerMinute: options.rateLimiting?.maxPerMinute ?? 60
            },
            staticDir: options.staticDir || ''
        };
    }

    public async start(): Promise<void> {
        if (!this.options.enabled) {
            console.log('Web runtime disabled by settings.');
            return;
        }

        if (this.server?.listening) return;

        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res).catch((error) => {
                console.error('Web runtime request error:', error);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                }
                res.end(JSON.stringify({ error: 'Internal web runtime error' }));
            });
        });

        await new Promise<void>((resolve, reject) => {
            const onListening = () => {
                this.server?.off('error', onError);
                console.log(`Web runtime listening on 0.0.0.0:${this.options.port}`);
                resolve();
            };
            const onError = (err: NodeJS.ErrnoException) => {
                this.server?.off('listening', onListening);
                if (err.code === 'EADDRINUSE') {
                    console.warn(`Web runtime port ${this.options.port} already in use. Skipping startup.`);
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

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
        if (!this.applyCors(origin, res)) {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'CORS origin denied by settings.' }));
            return;
        }

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const clientIp = this.normalizeIp(req.socket.remoteAddress || '');
        if (this.isRateLimited(clientIp)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Rate limit exceeded for this client.' }));
            return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (req.method === 'GET' && pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                status: 'ok',
                staticDir: this.options.staticDir || null,
                rateLimiting: this.options.rateLimiting
            }));
            return;
        }

        if (req.method === 'GET' && pathname.startsWith('/static/')) {
            await this.serveStatic(pathname.slice('/static/'.length), res);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }

    private applyCors(origin: string, res: http.ServerResponse): boolean {
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (this.options.corsOrigins.length === 0) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            return true;
        }

        if (origin && this.options.corsOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
            return true;
        }

        return false;
    }

    private isRateLimited(clientIp: string): boolean {
        if (!this.options.rateLimiting.enabled) return false;
        const maxPerMinute = Math.max(1, this.options.rateLimiting.maxPerMinute || 60);

        const now = Date.now();
        const minuteStart = now - (now % 60000);
        const current = this.rateWindows.get(clientIp);
        if (!current || current.minuteStart !== minuteStart) {
            this.rateWindows.set(clientIp, { minuteStart, count: 1 });
            return false;
        }

        current.count += 1;
        this.rateWindows.set(clientIp, current);
        return current.count > maxPerMinute;
    }

    private async serveStatic(relativePath: string, res: http.ServerResponse): Promise<void> {
        if (!this.options.staticDir) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Static directory is not configured.' }));
            return;
        }

        const staticRoot = path.resolve(this.options.staticDir);
        const target = path.resolve(staticRoot, relativePath);
        if (!target.startsWith(staticRoot + path.sep) && target !== staticRoot) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Invalid static path.' }));
            return;
        }

        if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Static file not found.' }));
            return;
        }

        const ext = path.extname(target).toLowerCase();
        const contentType = this.getMimeType(ext);
        const data = await fs.promises.readFile(target);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    }

    private getMimeType(ext: string): string {
        switch (ext) {
            case '.html': return 'text/html; charset=utf-8';
            case '.css': return 'text/css; charset=utf-8';
            case '.js': return 'text/javascript; charset=utf-8';
            case '.json': return 'application/json; charset=utf-8';
            case '.png': return 'image/png';
            case '.jpg':
            case '.jpeg': return 'image/jpeg';
            case '.gif': return 'image/gif';
            case '.svg': return 'image/svg+xml';
            case '.txt':
            default: return 'text/plain; charset=utf-8';
        }
    }

    private normalizeIp(raw: string): string {
        const trimmed = raw.trim();
        if (!trimmed) return 'unknown';
        if (trimmed === '::1') return '127.0.0.1';
        if (trimmed.startsWith('::ffff:')) return trimmed.slice('::ffff:'.length);
        return trimmed;
    }
}
