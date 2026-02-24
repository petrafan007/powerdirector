// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import SpotifyWebApi from 'spotify-web-api-node';

export class SpotifyTool implements Tool {
    public name = 'spotify';
    public description = 'Control Spotify playback. Actions: play, pause, next, prev, search.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['play', 'pause', 'next', 'prev', 'search'] },
            query: { type: 'string', description: 'Search query (for search)' },
            type: { type: 'string', description: 'Search type (track, artist, album)' }
        },
        required: ['action']
    };

    private api: SpotifyWebApi;

    constructor(clientId: string, clientSecret: string, refreshToken?: string) {
        this.api = new SpotifyWebApi({
            clientId,
            clientSecret,
            refreshToken
        });
    }

    private async refreshAccessToken() {
        try {
            const data = await this.api.clientCredentialsGrant();
            this.api.setAccessToken(data.body['access_token']);
        } catch (err) {
            console.error('Failed to retrieve access token', err);
        }
    }

    async execute(args: any): Promise<ToolResult> {
        // Attempt refresh (simplistic for now)
        await this.refreshAccessToken();

        try {
            switch (args.action) {
                case 'search':
                    if (!args.query) return { output: 'Query required', isError: true };
                    const type = args.type || 'track';
                    // @ts-ignore
                    const result = await this.api[`search${type.charAt(0).toUpperCase() + type.slice(1)}s`](args.query);
                    return { output: JSON.stringify(result.body, null, 2) };

                // Playback controls usually need user auth flow, but we can try if scope allows
                case 'play':
                    // await this.api.play(); // Requires user authentication context
                    return { output: 'Playback control requires user authentication (OAuth flow needed). Search is available.', isError: true };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Spotify Error: ${error.message}`, isError: true };
        }
    }
}
