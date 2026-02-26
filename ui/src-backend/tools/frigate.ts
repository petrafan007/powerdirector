// @ts-nocheck
import { Tool, ToolResult } from './base';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { getRuntimeLogger } from '../core/logger.ts';
import { execSync } from 'child_process';

const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');

/**
 * Validates that a buffer contains actual image data by checking magic bytes.
 */
function validateImageMagicBytes(buffer: Buffer): string | null {
    if (buffer.length < 8) return null;
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'png';
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'gif';
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'webp';
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'bmp';
    return null;
}

function isLikelyJson(buffer: Buffer): boolean {
    if (buffer.length < 2) return false;
    return buffer[0] === 0x7B || buffer[0] === 0x5B;
}

async function fetchUrl(url: string, timeout: number = 10000): Promise<{ buffer: Buffer; contentType: string | null }> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.get(url, { timeout, headers: { 'Accept': 'image/*', 'User-Agent': 'PowerDirector-FrigateTool/1.0' } }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || null }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
}

export class FrigateTool implements Tool {
    public name = 'frigate';
    public description = `Interact with Frigate NVR to fetch camera snapshots, events, and clips.

IMPORTANT: This tool validates that fetched images are ACTUAL image files before saving.
It checks magic bytes (file signatures) to confirm JPEG, PNG, WebP, GIF, or BMP format.
It will NOT save a file if the response is not a valid image (e.g., JSON error responses).

Actions:
- snapshot: Fetch a snapshot from a camera
- event_snapshot: Fetch a snapshot for a specific event ID
- events: List recent events for a camera
- event_clip: Fetch a clip for a specific event ID

Use this tool instead of curl to fetch images from Frigate - it properly validates responses.`;

    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['snapshot', 'event_snapshot', 'events', 'oldest_events', 'event_clip'], description: 'Action to perform' },
            host: { type: 'string', description: 'Frigate host (default: http://localhost:5000)', default: 'http://localhost:5000' },
            camera: { type: 'string', description: 'Camera name (e.g., "patio", "front_door")' },
            eventId: { type: 'string', description: 'Event ID for event_snapshot or event_clip actions' },
            label: { type: 'string', description: 'Filter events by label (e.g., "dog", "person", "car")' },
            after: { type: 'number', description: 'Unix timestamp to filter events after this time' },
            today: { type: 'boolean', description: 'If true, filter events from the start of the current day (00:00:00)' },
            limit: { type: 'number', description: 'Maximum number of events to return', default: 10 },
            order: { type: 'string', enum: ['desc', 'asc'], description: 'Sort order for events (defaults to newest-first desc)', default: 'desc' }
        },
        required: ['action']
    };

    async execute(args: any): Promise<ToolResult> {
        const { action, host = 'http://localhost:5000', camera, eventId, outputPath, label, after, limit = 10 } = args;
        try {
            switch (action) {
                case 'snapshot': return await this.fetchSnapshot(host, camera, outputPath);
                case 'event_snapshot': return await this.fetchEventSnapshot(host, eventId, outputPath);
                case 'events': return await this.listEvents(host, camera, label, after || (args.today ? this.getStartOfToday() : undefined), limit, args.order);
                case 'oldest_events': return await this.listOldestEventsDirectly(camera, label, limit, args.today);
                case 'event_clip': return await this.fetchEventClip(host, eventId, outputPath);
                default: return { output: `Unknown action: ${action}`, isError: true };
            }
        } catch (error: any) { return { output: `Error: ${error.message}`, isError: true }; }
    }

    private async fetchSnapshot(host: string, camera: string | undefined, outputPath: string | undefined): Promise<ToolResult> {
        if (!camera) return { output: 'Camera name is required for snapshot action', isError: true };
        return this.fetchAndValidateImage(`${host}/api/${camera}/latest.jpg`, outputPath, `snapshot for camera "${camera}"`);
    }

    private async fetchEventSnapshot(host: string, eventId: string | undefined, outputPath: string | undefined): Promise<ToolResult> {
        if (!eventId) return { output: 'Event ID is required for event_snapshot action', isError: true };
        return this.fetchAndValidateImage(`${host}/api/events/${eventId}/snapshot.jpg`, outputPath, `event snapshot for ID "${eventId}"`);
    }

    private async fetchEventClip(host: string, eventId: string | undefined, outputPath: string | undefined): Promise<ToolResult> {
        const logger = getRuntimeLogger();
        if (!eventId) return { output: 'Event ID is required for event_clip action', isError: true };
        try {
            const { buffer } = await fetchUrl(`${host}/api/events/${eventId}/clip.mp4`);
            if (buffer.length < 12) return { output: `Error: Response too small (${buffer.length} bytes)`, isError: true };
            if (isLikelyJson(buffer)) {
                try {
                    const json = JSON.parse(buffer.toString('utf-8'));
                    return { output: `Error: No video available. Server: ${JSON.stringify(json)}`, isError: true };
                } catch { }
            }
            // ALWAYS save to media directory for consistent access via /api/media
            const filename = `frigate-clip-${eventId}-${Date.now()}.mp4`;
            const finalPath = path.join(MEDIA_DIR, filename);

            try {
                await fs.promises.mkdir(MEDIA_DIR, { recursive: true });
                await fs.promises.writeFile(finalPath, buffer);
                logger.info(`[FrigateTool] Saved video clip to ${finalPath}`);
            } catch (err: any) {
                logger.error(`[FrigateTool] Failed to save video clip: ${err.message}`);
                return { output: `Error saving video clip: ${err.message}`, isError: true };
            }

            const relativePath = path.relative(process.cwd(), finalPath);
            return { output: `Video clip saved: ${relativePath} (${buffer.length} bytes)` };
        } catch (error: any) { return { output: `Error fetching clip: ${error.message}`, isError: true }; }
    }

    private async fetchAndValidateImage(url: string, outputPath: string | undefined, description: string): Promise<ToolResult> {
        const logger = getRuntimeLogger();
        let buffer: Buffer, contentType: string | null;
        try { ({ buffer, contentType } = await fetchUrl(url)); }
        catch (error: any) { return { output: `Error fetching ${description}: ${error.message}`, isError: true }; }

        if (buffer.length === 0) return { output: `Error: Empty response for ${description}. Camera may be offline.`, isError: true };

        if (isLikelyJson(buffer)) {
            try {
                const json = JSON.parse(buffer.toString('utf-8'));
                return { output: `Error: No valid image for ${description}. Server: ${json.message || json.error || JSON.stringify(json)}`, isError: true };
            } catch { }
        }

        const imageType = validateImageMagicBytes(buffer);
        if (!imageType) {
            const firstBytes = Array.from(buffer.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
            return { output: `Error: Response for ${description} is not a valid image. Content-Type: ${contentType}, first bytes: ${firstBytes}`, isError: true };
        }

        const ext = imageType === 'jpeg' ? 'jpg' : imageType;
        // ALWAYS use media directory - ignore outputPath from LLM to prevent saving to wrong locations
        const filename = `frigate-${Date.now()}.${ext}`;
        const finalPath = path.join(MEDIA_DIR, filename);

        try {
            await fs.promises.mkdir(MEDIA_DIR, { recursive: true });
            await fs.promises.writeFile(finalPath, buffer);
            logger.info(`[FrigateTool] Saved image to ${finalPath}`);
        } catch (err: any) {
            logger.error(`[FrigateTool] Failed to save image: ${err.message}`);
            return { output: `Error saving image: ${err.message}`, isError: true };
        }

        // Return path relative to cwd for display (so UI can find it via /api/media)
        const relativePath = path.relative(process.cwd(), finalPath);
        return { output: `Image saved: ${relativePath} (${buffer.length} bytes, type: ${imageType})` };
    }

    private getStartOfToday(): number {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.floor(now.getTime() / 1000);
    }

    private async listEvents(host: string, camera: string | undefined, label: string | undefined, after: number | undefined, limit: number, order: string = 'desc'): Promise<ToolResult> {
        const params = new URLSearchParams();
        if (camera) params.append('camera', camera);
        if (label) params.append('label', label);
        if (after) params.append('after', after.toString());
        params.append('limit', limit.toString());

        try {
            const { buffer } = await fetchUrl(`${host}/api/events?${params.toString()}`);
            let events = JSON.parse(buffer.toString('utf-8'));
            if (!Array.isArray(events) || events.length === 0) return { output: 'No events found.' };

            // Note: Frigate API defaults to newest-first (desc). 
            // If the user specifically asked for 'asc', we reverse the window we got. 
            // WARNING: This only reverses the CURRENT PAGE of results. 
            // For TRULY oldest events, use the 'oldest_events' action.
            if (order === 'asc') {
                events = [...events].reverse();
            }

            const summary = events.map((e: any, i: number) => {
                const time = e.start_time ? new Date(e.start_time * 1000).toLocaleString() : 'unknown';
                return `${i + 1}. ${e.id}: ${e.label || '?'} on ${e.camera || '?'} at ${time}`;
            }).join('\n');
            return { output: `Found ${events.length} events (${order}):\n${summary}` };
        } catch (error: any) { return { output: `Error: ${error.message}`, isError: true }; }
    }

    private async listOldestEventsDirectly(camera: string | undefined, label: string | undefined, limit: number, todayOnly?: boolean): Promise<ToolResult> {
        const dbPath = '/mnt/backup/cameras/config/frigate.db';
        if (!fs.existsSync(dbPath)) {
            return { output: `Error: Frigate database not found at ${dbPath}. Cannot query oldest events directly.`, isError: true };
        }

        try {
            let query = `SELECT id, camera, label, start_time FROM event WHERE 1=1`;
            if (camera) query += ` AND camera = '${camera.replace(/'/g, "''")}'`;
            if (label) query += ` AND label = '${label.replace(/'/g, "''")}'`;
            if (todayOnly) {
                query += ` AND start_time >= ${this.getStartOfToday()}`;
            }
            query += ` ORDER BY start_time ASC LIMIT ${limit}`;

            // Use CSV mode as it's more portable than -json
            const cmd = `sqlite3 -header -csv ${dbPath} "${query.replace(/"/g, '\\"')}"`;
            const output = execSync(cmd).toString().trim();
            if (!output) return { output: `No events found${todayOnly ? ' today' : ''} in database.` };

            // Very basic CSV to JSON-like objects parser
            const lines = output.split('\n');
            const headers = lines[0].split(',').map(h => h.replace(/^"(.*)"$/, '$1'));
            const events = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.replace(/^"(.*)"$/, '$1'));
                const obj: any = {};
                headers.forEach((h, i) => obj[h] = h === 'start_time' ? parseFloat(values[i]) : values[i]);
                return obj;
            });

            const summary = events.map((e: any, i: number) => {
                const time = e.start_time ? new Date(e.start_time * 1000).toLocaleString() : 'unknown';
                return `${i + 1}. ${e.id}: ${e.label || '?'} on ${e.camera || '?'} at ${time}`;
            }).join('\n');

            return { output: `Found ${events.length} oldest events${todayOnly ? ' from today' : ''} from DB:\n${summary}` };
        } catch (error: any) {
            return { output: `Error querying Frigate DB: ${error.message}`, isError: true };
        }
    }
}

export const frigateTool = new FrigateTool();