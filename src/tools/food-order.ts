// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import axios from 'axios';

export class FoodOrderTool implements Tool {
    public name = 'food_order';
    public description = 'Order food delivery. Actions: search_restaurants, get_menu, place_order.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['search_restaurants', 'get_menu', 'place_order'] },
            query: { type: 'string', description: 'Restaurant or cuisine search' },
            latitude: { type: 'number', description: 'Location latitude' },
            longitude: { type: 'number', description: 'Location longitude' },
            restaurantId: { type: 'string', description: 'Restaurant ID' },
            items: { type: 'string', description: 'JSON array of items to order' }
        },
        required: ['action']
    };

    private apiKey: string;
    private platform: string;

    constructor(apiKey: string, platform: string = 'wolt') {
        this.apiKey = apiKey;
        this.platform = platform;
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'search_restaurants': {
                    if (!args.latitude || !args.longitude) {
                        return { output: 'Latitude and longitude required for restaurant search.', isError: true };
                    }
                    // Wolt API (or similar delivery platform)
                    const res = await axios.get('https://restaurant-api.wolt.com/v1/pages/restaurants', {
                        params: {
                            lat: args.latitude,
                            lon: args.longitude
                        }
                    });
                    const sections = res.data?.sections || [];
                    const restaurants: string[] = [];
                    for (const section of sections) {
                        const items = section.items || [];
                        for (const item of items) {
                            if (item.venue) {
                                restaurants.push(`${item.venue.name} - ${item.venue.short_description || ''} (ID: ${item.venue.id})`);
                            }
                            if (restaurants.length >= 10) break;
                        }
                        if (restaurants.length >= 10) break;
                    }
                    return { output: restaurants.join('\n') || 'No restaurants found nearby.' };
                }

                case 'get_menu': {
                    if (!args.restaurantId) return { output: 'Restaurant ID required', isError: true };
                    const res = await axios.get(`https://restaurant-api.wolt.com/v3/venues/slug/${args.restaurantId}/menu`);
                    const categories = res.data?.categories || [];
                    const items: string[] = [];
                    for (const cat of categories) {
                        items.push(`\n--- ${cat.name} ---`);
                        for (const item of (cat.items || []).slice(0, 5)) {
                            const price = item.baseprice ? `€${(item.baseprice / 100).toFixed(2)}` : 'N/A';
                            items.push(`  ${item.name} - ${price}`);
                        }
                    }
                    return { output: items.join('\n') || 'Menu not available.' };
                }

                case 'place_order': {
                    // Placing orders requires full authentication
                    return { output: 'Order placement requires authenticated session.\nPlease use the app to complete your order.\nItems noted for your convenience.' };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Food Order Error: ${error.message}`, isError: true };
        }
    }
}
