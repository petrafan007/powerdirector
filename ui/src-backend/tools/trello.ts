// @ts-nocheck
import { Tool, ToolResult } from './base';
// @ts-ignore
import Trello from 'trello';

export class TrelloTool implements Tool {
    public name = 'trello';
    public description = 'Manage Trello boards. Actions: get_boards, get_cards, add_card.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['get_boards', 'get_cards', 'add_card'] },
            boardId: { type: 'string', description: 'Board ID' },
            listId: { type: 'string', description: 'List ID' },
            name: { type: 'string', description: 'Card name' },
            desc: { type: 'string', description: 'Card description' }
        },
        required: ['action']
    };

    private client: any;

    constructor(apiKey: string, token: string) {
        this.client = new Trello(apiKey, token);
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'get_boards':
                    const boards = await this.client.getBoards('me');
                    // @ts-ignore
                    return { output: boards.map(b => `${b.name} (${b.id})`).join('\n') };

                case 'get_cards':
                    if (!args.boardId) return { output: 'Board ID required', isError: true };
                    const cards = await this.client.getCardsOnBoard(args.boardId);
                    // @ts-ignore
                    return { output: cards.map(c => `${c.name} (${c.idShort})`).join('\n') };

                case 'add_card':
                    if (!args.listId || !args.name) return { output: 'List ID and Name required', isError: true };
                    const newCard = await this.client.addCard(args.name, args.desc || '', args.listId);
                    return { output: `Card added: ${newCard.url}` };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Trello Error: ${error.message}`, isError: true };
        }
    }
}
