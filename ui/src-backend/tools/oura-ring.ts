// @ts-nocheck
import { Tool, ToolResult } from './base.js';
import axios from 'axios';

export class OuraRingTool implements Tool {
    public name = 'oura_ring';
    public description = 'Get health data from Oura Ring. Actions: get_sleep, get_readiness, get_activity.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['get_sleep', 'get_readiness', 'get_activity'] },
            date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' }
        },
        required: ['action']
    };

    private token: string;
    private baseUrl = 'https://api.ouraring.com/v2/usercollection';

    constructor(token: string) {
        this.token = token;
    }

    async execute(args: any): Promise<ToolResult> {
        const date = args.date || new Date().toISOString().split('T')[0];
        const headers = { Authorization: `Bearer ${this.token}` };

        try {
            switch (args.action) {
                case 'get_sleep': {
                    const res = await axios.get(`${this.baseUrl}/daily_sleep`, {
                        params: { start_date: date, end_date: date },
                        headers
                    });
                    const data = res.data?.data?.[0];
                    if (!data) return { output: `No sleep data for ${date}` };
                    return { output: `Sleep Score: ${data.score}\nContributors:\n  Deep Sleep: ${data.contributors?.deep_sleep}\n  Efficiency: ${data.contributors?.efficiency}\n  Latency: ${data.contributors?.latency}\n  REM: ${data.contributors?.rem_sleep}\n  Restfulness: ${data.contributors?.restfulness}\n  Timing: ${data.contributors?.timing}\n  Total Sleep: ${data.contributors?.total_sleep}` };
                }

                case 'get_readiness': {
                    const res = await axios.get(`${this.baseUrl}/daily_readiness`, {
                        params: { start_date: date, end_date: date },
                        headers
                    });
                    const data = res.data?.data?.[0];
                    if (!data) return { output: `No readiness data for ${date}` };
                    return { output: `Readiness Score: ${data.score}\nTemperature Deviation: ${data.temperature_deviation}°C\nContributors:\n  Activity Balance: ${data.contributors?.activity_balance}\n  Body Temperature: ${data.contributors?.body_temperature}\n  HRV Balance: ${data.contributors?.hrv_balance}\n  Recovery Index: ${data.contributors?.recovery_index}\n  Resting HR: ${data.contributors?.resting_heart_rate}\n  Sleep Balance: ${data.contributors?.sleep_balance}` };
                }

                case 'get_activity': {
                    const res = await axios.get(`${this.baseUrl}/daily_activity`, {
                        params: { start_date: date, end_date: date },
                        headers
                    });
                    const data = res.data?.data?.[0];
                    if (!data) return { output: `No activity data for ${date}` };
                    return { output: `Activity Score: ${data.score}\nSteps: ${data.steps}\nActive Calories: ${data.active_calories}\nTotal Calories: ${data.total_calories}\nContributors:\n  Meet Daily Targets: ${data.contributors?.meet_daily_targets}\n  Move Every Hour: ${data.contributors?.move_every_hour}\n  Recovery Time: ${data.contributors?.recovery_time}\n  Stay Active: ${data.contributors?.stay_active}\n  Training Frequency: ${data.contributors?.training_frequency}\n  Training Volume: ${data.contributors?.training_volume}` };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Oura Error: ${error.message}`, isError: true };
        }
    }
}
