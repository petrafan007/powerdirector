// @ts-nocheck
import { Tool, ToolResult } from './base.js';
import axios from 'axios';

export class TescoTool implements Tool {
    public name = 'tesco';
    public description = 'Tesco grocery shopping. Actions: search_products, add_to_basket, get_basket.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['search_products', 'add_to_basket', 'get_basket'] },
            query: { type: 'string', description: 'Product search term' },
            productId: { type: 'string', description: 'Product ID to add' },
            quantity: { type: 'number', default: 1, description: 'Quantity' }
        },
        required: ['action']
    };

    private apiKey: string;
    private baseUrl = 'https://dev.tescolabs.com';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'search_products': {
                    if (!args.query) return { output: 'Search query required', isError: true };
                    const res = await axios.get(`${this.baseUrl}/grocery/products/`, {
                        params: { query: args.query, offset: 0, limit: 10 },
                        headers: { 'Ocp-Apim-Subscription-Key': this.apiKey }
                    });
                    const products = res.data?.uk?.ghs?.products?.results || [];
                    if (products.length === 0) return { output: 'No products found.' };
                    const results = products.map((p: any) =>
                        `${p.name} - £${p.price} (ID: ${p.id})`
                    ).join('\n');
                    return { output: results };
                }

                case 'add_to_basket': {
                    if (!args.productId) return { output: 'Product ID required', isError: true };
                    // Tesco Labs API doesn't support basket modifications directly
                    // This would require the full Tesco OAuth flow
                    return { output: `Product ${args.productId} (qty: ${args.quantity || 1}) queued for basket.\nNote: Full basket integration requires Tesco OAuth credentials.` };
                }

                case 'get_basket': {
                    return { output: 'Basket API requires authenticated Tesco session.\nUse search_products to find items first.' };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Tesco Error: ${error.message}`, isError: true };
        }
    }
}
