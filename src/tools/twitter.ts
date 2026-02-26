// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import { TwitterApi } from 'twitter-api-v2';

export class TwitterTool implements Tool {
    public name = 'twitter';
    public description = 'Interact with Twitter/X. Actions: post_tweet, search_tweets, get_user.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['post_tweet', 'search_tweets', 'get_user'] },
            text: { type: 'string', description: 'Tweet content (for post_tweet)' },
            query: { type: 'string', description: 'Search query (for search_tweets)' },
            username: { type: 'string', description: 'Username (for get_user)' }
        },
        required: ['action']
    };

    private client: TwitterApi;

    constructor(appKey: string, appSecret: string, accessToken: string, accessSecret: string) {
        this.client = new TwitterApi({
            appKey,
            appSecret,
            accessToken,
            accessSecret,
        });
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            const rwClient = this.client.readWrite;

            switch (args.action) {
                case 'post_tweet':
                    if (!args.text) return { output: 'Text required', isError: true };
                    const tweet = await rwClient.v2.tweet(args.text);
                    return { output: `Tweet posted! ID: ${tweet.data.id}` };

                case 'search_tweets':
                    if (!args.query) return { output: 'Query required', isError: true };
                    const search = await rwClient.v2.search(args.query);
                    // Simplify output
                    const tweets = search.tweets.map(t => `${t.author_id}: ${t.text}`).join('\n');
                    return { output: tweets || 'No tweets found.' };

                case 'get_user':
                    if (!args.username) return { output: 'Username required', isError: true };
                    const user = await rwClient.v2.userByUsername(args.username);
                    return { output: JSON.stringify(user.data, null, 2) };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Twitter Error: ${error.message}`, isError: true };
        }
    }
}
