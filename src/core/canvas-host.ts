// @ts-nocheck
import path from 'node:path';
import { safeHomedir } from '../infra/os-safe.js';

type JsonObject = Record<string, any>;

export interface CanvasHostConfig {
    enabled?: boolean;
    root?: string;
    port?: number;
    liveReload?: boolean;
}

interface CanvasLaunchRequest {
    tool: string;
    args?: JsonObject;
    width?: number;
    height?: number;
}

export interface CanvasLaunchResult {
    launchUrl: string;
    payload: JsonObject;
}

function normalizeString(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
}

export class CanvasHostManager {
    private readonly enabled: boolean;
    private readonly root: string;
    private readonly port: number;
    private readonly liveReload: boolean;

    private readonly defaultWidth: number = 1920;
    private readonly defaultHeight: number = 1080;
    private readonly basePath: string = '/__powerdirector__/canvas';

    constructor(config: CanvasHostConfig = {}) {
        this.enabled = config.enabled !== false;
        this.root = this.resolveRoot(config.root);
        this.port = this.normalizePort(config.port);
        this.liveReload = config.liveReload !== false;
    }

    public getStatus(): {
        enabled: boolean;
        root: string;
        port: number;
        liveReload: boolean;
    } {
        return {
            enabled: this.enabled,
            root: this.root,
            port: this.port,
            liveReload: this.liveReload
        };
    }

    public createLaunch(request: CanvasLaunchRequest): CanvasLaunchResult {
        if (!this.enabled) {
            throw new Error('Canvas host is disabled by settings.');
        }

        const tool = normalizeString(request.tool);
        if (!tool) {
            throw new Error('Canvas tool is required.');
        }

        const width = this.clampDimension(request.width, this.defaultWidth);
        const height = this.clampDimension(request.height, this.defaultHeight);

        const payload = {
            tool,
            args: request.args && typeof request.args === 'object' ? request.args : {},
            width,
            height,
            ts: Date.now()
        };

        const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
        const launchUrl = `http://127.0.0.1:${this.port}${this.basePath}/launch?payload=${encoded}`;
        return {
            launchUrl,
            payload
        };
    }

    private resolveRoot(rawRoot: any): string {
        const trimmed = normalizeString(rawRoot);
        if (trimmed) {
            return path.resolve(trimmed);
        }
        return path.join(safeHomedir(), '.powerdirector', 'workspace', 'canvas');
    }

    private normalizePort(value: any): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            const normalized = Math.floor(value);
            if (normalized > 0 && normalized <= 65535) {
                return normalized;
            }
        }
        return 18793;
    }

    private clampDimension(value: any, fallback: number): number {
        const parsed = typeof value === 'number' && Number.isFinite(value)
            ? Math.floor(value)
            : fallback;
        return Math.max(240, Math.min(3840, parsed));
    }
}
