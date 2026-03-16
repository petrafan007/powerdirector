// @ts-nocheck

import { OpenAICompatibleProvider, OpenAICompatibleConfig } from './openai-compatible.js';
import { ProviderConfig } from '../reliability/types.ts';

export class MinimaxProvider extends OpenAICompatibleProvider {
    constructor(
        private accessToken: string,
        model: string,
        config: Partial<ProviderConfig> = {}
    ) {
        const openAIConfig: OpenAICompatibleConfig = {
            name: 'minimax',
            apiKey: accessToken,
            baseURL: config.apiEndpoint || 'https://api.minimax.io/v1',
            defaultModel: model,
            timeoutMs: config.timeoutMs,
            rateLimitPerMinute: config.rateLimitPerMinute
        };

        super(openAIConfig);
    }
}
