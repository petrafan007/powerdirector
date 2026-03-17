// @ts-nocheck
import { Tool, ToolResult } from './base';
import axios from 'axios';

export class WeatherTool implements Tool {
    public name = 'weather';
    public description = 'Get weather forecasts and conditions. Actions: get_current, get_forecast.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['get_current', 'get_forecast'] },
            location: { type: 'string', description: 'City name or location' }
        },
        required: ['action', 'location']
    };

    async execute(args: any): Promise<ToolResult> {
        try {
            if (!args.location) return { output: 'Location required', isError: true };
            // wttr.in format=j1 returns JSON
            const url = `https://wttr.in/${encodeURIComponent(args.location)}?format=j1`;
            const response = await axios.get(url);

            if (args.action === 'get_current') {
                const current = response.data.current_condition[0];
                return {
                    output: `Current weather in ${args.location}:\nTemp: ${current.temp_C}°C / ${current.temp_F}°F\nCondition: ${current.weatherDesc[0].value}\nHumidity: ${current.humidity}%\nWind: ${current.windspeedKmph} km/h`
                };
            } else if (args.action === 'get_forecast') {
                const forecast = response.data.weather.slice(0, 3).map((day: any) => {
                    return `Date: ${day.date}\nMax: ${day.maxtempC}°C / ${day.maxtempF}°F\nMin: ${day.mintempC}°C / ${day.mintempF}°F\nCondition: ${day.hourly[4].weatherDesc[0].value}`; // Noon condition roughly
                }).join('\n\n');
                return { output: `Forecast for ${args.location}:\n\n${forecast}` };
            }

            return { output: `Unknown action: ${args.action}`, isError: true };

        } catch (error: any) {
            return { output: `Weather Error: ${error.message}`, isError: true };
        }
    }
}
