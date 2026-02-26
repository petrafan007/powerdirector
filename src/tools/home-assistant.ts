// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import {
    Auth,
    createConnection,
    subscribeEntities,
    callService,
    Connection,
    createLongLivedTokenAuth
} from 'home-assistant-js-websocket';
// We need a WebSocket implementation for Node.js
import WebSocket from 'ws';

// Global WS for the library
(global as any).WebSocket = WebSocket;

export class HomeAssistantTool implements Tool {
    public name = 'home_assistant';
    public description = 'Control Home Assistant. Actions: get_state, call_service, list_entities.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['get_state', 'call_service', 'list_entities'] },
            entity_id: { type: 'string', description: 'Entity ID (e.g. light.living_room)' },
            domain: { type: 'string', description: 'Service domain (e.g. light)' },
            service: { type: 'string', description: 'Service name (e.g. turn_on)' },
            service_data: { type: 'string', description: 'JSON string of service data' }
        },
        required: ['action']
    };

    private connection: Connection | null = null;
    private auth: Auth;
    private entities: any = {};

    constructor(url: string, token: string) {
        this.auth = createLongLivedTokenAuth(url, token);
    }

    private async ensureConnection() {
        if (!this.connection) {
            this.connection = await createConnection({ auth: this.auth });
            subscribeEntities(this.connection, (ents) => {
                this.entities = ents;
            });
        }
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            await this.ensureConnection();

            switch (args.action) {
                case 'list_entities':
                    return { output: Object.keys(this.entities).join('\n') };

                case 'get_state':
                    if (!args.entity_id) return { output: 'Entity ID required', isError: true };
                    const state = this.entities[args.entity_id];
                    return { output: state ? JSON.stringify(state, null, 2) : 'Entity not found' };

                case 'call_service':
                    if (!args.domain || !args.service) return { output: 'Domain and service required', isError: true };
                    const serviceData = args.service_data ? JSON.parse(args.service_data) : {};
                    await callService(this.connection!, args.domain, args.service, serviceData);
                    return { output: `Called service ${args.domain}.${args.service}` };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Home Assistant Error: ${error.message}`, isError: true };
        }
    }
}
