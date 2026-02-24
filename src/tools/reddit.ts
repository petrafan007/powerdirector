// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import Snoowrap from 'snoowrap';

export class RedditTool implements Tool {
    public name = 'reddit';
    public description = 'Interact with Reddit. Actions: get_hot, get_user, post_submission, search.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['get_hot', 'get_user', 'post_submission', 'search'] },
            subreddit: { type: 'string', description: 'Subreddit name (for get_hot/post_submission)' },
            username: { type: 'string', description: 'Username (for get_user)' },
            title: { type: 'string', description: 'Post title' },
            text: { type: 'string', description: 'Post text' },
            query: { type: 'string', description: 'Search query' }
        },
        required: ['action']
    };

    private client: Snoowrap;

    constructor(userAgent: string, clientId: string, clientSecret: string, refreshToken: string) {
        this.client = new Snoowrap({
            userAgent,
            clientId,
            clientSecret,
            refreshToken
        });
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'get_hot':
                    if (!args.subreddit) return { output: 'Subreddit required', isError: true };
                    const hotPosts = await this.client.getSubreddit(args.subreddit).getHot({ limit: 5 });
                    return { output: hotPosts.map(p => `${p.title} (${p.score})`).join('\n') };

                case 'get_user':
                    if (!args.username) return { output: 'Username required', isError: true };
                    // @ts-ignore - Snoowrap types can be circular
                    const user = await this.client.getUser(args.username).fetch();
                    return { output: `User: ${user.name}, Karma: ${user.link_karma + user.comment_karma}` };

                case 'post_submission':
                    if (!args.subreddit || !args.title) return { output: 'Subreddit and title required', isError: true };
                    // @ts-ignore
                    const submission = await this.client.getSubreddit(args.subreddit).submitSelfpost({
                        subredditName: args.subreddit,
                        title: args.title,
                        text: args.text || ''
                    });
                    return { output: `Posted! ID: ${submission.name}` };

                case 'search':
                    if (!args.query) return { output: 'Query required', isError: true };
                    const results = await this.client.search({ query: args.query, limit: 5 });
                    return { output: results.map(p => `/r/${p.subreddit.display_name}: ${p.title}`).join('\n') };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Reddit Error: ${error.message}`, isError: true };
        }
    }
}
