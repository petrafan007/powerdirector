// @ts-nocheck
import { Tool, ToolResult } from './base.js';
import axios from 'axios';

export class ShazamTool implements Tool {
    public name = 'shazam';
    public description = 'Identify songs from audio or search for song info. Actions: identify, search.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['identify', 'search'] },
            query: { type: 'string', description: 'Song name or artist to search' },
            audioPath: { type: 'string', description: 'Path to audio file for identification' }
        },
        required: ['action']
    };

    private apiKey: string;

    constructor(apiKey: string) {
        // Uses RapidAPI Shazam endpoint
        this.apiKey = apiKey;
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'search': {
                    if (!args.query) return { output: 'Query required', isError: true };
                    const res = await axios.get('https://shazam.p.rapidapi.com/search', {
                        params: { term: args.query, locale: 'en-US', offset: '0', limit: '5' },
                        headers: {
                            'X-RapidAPI-Key': this.apiKey,
                            'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
                        }
                    });
                    const tracks = res.data?.tracks?.hits || [];
                    if (tracks.length === 0) return { output: 'No results found.' };
                    const results = tracks.map((t: any) =>
                        `${t.track.title} - ${t.track.subtitle}`
                    ).join('\n');
                    return { output: results };
                }

                case 'identify': {
                    if (!args.audioPath) return { output: 'Audio file path required', isError: true };
                    const fs = await import('fs');
                    if (!fs.existsSync(args.audioPath)) {
                        return { output: `File not found: ${args.audioPath}`, isError: true };
                    }
                    const audioData = fs.readFileSync(args.audioPath);
                    const base64 = audioData.toString('base64');

                    const res = await axios.post('https://shazam.p.rapidapi.com/songs/v2/detect', base64, {
                        headers: {
                            'X-RapidAPI-Key': this.apiKey,
                            'X-RapidAPI-Host': 'shazam.p.rapidapi.com',
                            'Content-Type': 'text/plain'
                        }
                    });
                    const track = res.data?.track;
                    if (!track) return { output: 'Could not identify song.' };
                    return { output: `Identified: ${track.title} by ${track.subtitle}` };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Shazam Error: ${error.message}`, isError: true };
        }
    }
}
