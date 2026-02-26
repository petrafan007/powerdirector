// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import axios from 'axios';

export class SonosTool implements Tool {
    public name = 'sonos';
    public description = 'Control Sonos speakers. Actions: play, pause, volume, now_playing.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['play', 'pause', 'volume', 'now_playing'] },
            speaker: { type: 'string', description: 'Speaker/room name' },
            level: { type: 'number', description: 'Volume level (0-100)' },
            uri: { type: 'string', description: 'Track URI to play' }
        },
        required: ['action']
    };

    private baseUrl: string;

    constructor(baseUrl: string) {
        // Expects node-sonos-http-api (https://github.com/jishi/node-sonos-http-api) running locally
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            const speaker = encodeURIComponent(args.speaker || 'Living Room');

            switch (args.action) {
                case 'play':
                    if (args.uri) {
                        await axios.get(`${this.baseUrl}/${speaker}/clip/${encodeURIComponent(args.uri)}`);
                    } else {
                        await axios.get(`${this.baseUrl}/${speaker}/play`);
                    }
                    return { output: `Playing on ${args.speaker || 'Living Room'}` };

                case 'pause':
                    await axios.get(`${this.baseUrl}/${speaker}/pause`);
                    return { output: `Paused ${args.speaker || 'Living Room'}` };

                case 'volume':
                    if (args.level === undefined) return { output: 'Volume level required', isError: true };
                    await axios.get(`${this.baseUrl}/${speaker}/volume/${args.level}`);
                    return { output: `Volume set to ${args.level} on ${args.speaker || 'Living Room'}` };

                case 'now_playing':
                    const res = await axios.get(`${this.baseUrl}/${speaker}/state`);
                    const state = res.data;
                    return { output: `Now Playing: ${state.currentTrack?.title || 'Nothing'} by ${state.currentTrack?.artist || 'Unknown'}\nVolume: ${state.volume}\nState: ${state.playbackState}` };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Sonos Error: ${error.message}`, isError: true };
        }
    }
}
