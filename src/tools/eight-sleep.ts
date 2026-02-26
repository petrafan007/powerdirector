// @ts-nocheck
import { Tool, ToolResult } from './base.js';
import axios from 'axios';

export class EightSleepTool implements Tool {
    public name = 'eight_sleep';
    public description = 'Control 8Sleep smart mattress. Actions: get_status, set_temperature, get_sleep_data.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['get_status', 'set_temperature', 'get_sleep_data'] },
            side: { type: 'string', enum: ['left', 'right'], description: 'Bed side' },
            temperature: { type: 'number', description: 'Temperature level (-10 to 10)' }
        },
        required: ['action']
    };

    private token: string;
    private baseUrl = 'https://client-api.8slp.net/v1';

    constructor(token: string) {
        this.token = token;
    }

    private get headers() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'get_status': {
                    const res = await axios.get(`${this.baseUrl}/users/me`, { headers: this.headers });
                    const user = res.data?.user;
                    return { output: `User: ${user?.firstName} ${user?.lastName}\nCurrent device linked.` };
                }

                case 'set_temperature': {
                    if (args.temperature === undefined || !args.side) {
                        return { output: 'Temperature and side required', isError: true };
                    }
                    // 8Sleep API uses heating level from -10 to 10
                    const level = Math.max(-10, Math.min(10, args.temperature));
                    const res = await axios.get(`${this.baseUrl}/users/me`, { headers: this.headers });
                    const deviceId = res.data?.user?.currentDevice?.id;
                    if (!deviceId) return { output: 'No device found', isError: true };

                    await axios.put(
                        `${this.baseUrl}/devices/${deviceId}`,
                        { [args.side]: { targetHeatingLevel: level } },
                        { headers: this.headers }
                    );
                    return { output: `Set ${args.side} side to level ${level}` };
                }

                case 'get_sleep_data': {
                    const res = await axios.get(`${this.baseUrl}/users/me/trends`, { headers: this.headers });
                    const trends = res.data;
                    return { output: JSON.stringify(trends, null, 2) };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `8Sleep Error: ${error.message}`, isError: true };
        }
    }
}
