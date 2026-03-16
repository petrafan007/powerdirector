// @ts-nocheck
import { Octokit } from 'octokit';
import { Tool, ToolResult } from './base.js';

export class GitHubTool implements Tool {
    public name = 'github';
    public description = 'Interact with GitHub. Actions: list_repos, list_issues, create_issue.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['list_repos', 'list_issues', 'create_issue'] },
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Issue title' },
            body: { type: 'string', description: 'Issue body' }
        },
        required: ['action']
    };

    private octokit: Octokit;

    constructor(auth: string) {
        this.octokit = new Octokit({ auth });
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'list_repos':
                    const { data: repos } = await this.octokit.rest.repos.listForAuthenticatedUser({ per_page: 5 });
                    return { output: repos.map((r: any) => `${r.full_name}: ${r.description}`).join('\n') };

                case 'list_issues':
                    if (!args.owner || !args.repo) return { output: 'Owner and repo required', isError: true };
                    const { data: issues } = await this.octokit.rest.issues.listForRepo({
                        owner: args.owner,
                        repo: args.repo,
                        per_page: 5
                    });
                    return { output: issues.map((i: any) => `#${i.number} ${i.title} (${i.state})`).join('\n') };

                case 'create_issue':
                    if (!args.owner || !args.repo || !args.title) return { output: 'Owner, repo, and title required', isError: true };
                    const { data: created } = await this.octokit.rest.issues.create({
                        owner: args.owner,
                        repo: args.repo,
                        title: args.title,
                        body: args.body
                    });
                    return { output: `Issue created: ${created.html_url}` };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `GitHub Error: ${error.message}`, isError: true };
        }
    }
}
