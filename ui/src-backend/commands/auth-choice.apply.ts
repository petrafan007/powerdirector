import type { PowerDirectorConfig } from '../config/config';
import type { RuntimeEnv } from '../runtime';
import type { WizardPrompter } from '../wizard/prompts';
import { applyAuthChoiceAnthropic } from './auth-choice.apply.anthropic';
import { applyAuthChoiceApiProviders } from './auth-choice.apply.api-providers';
import { applyAuthChoiceCopilotProxy } from './auth-choice.apply.copilot-proxy';
import { applyAuthChoiceGitHubCopilot } from './auth-choice.apply.github-copilot';
import { applyAuthChoiceGoogleAntigravity } from './auth-choice.apply.google-antigravity';
import { applyAuthChoiceGoogleGeminiCli } from './auth-choice.apply.google-gemini-cli';
import { applyAuthChoiceMiniMax } from './auth-choice.apply.minimax';
import { applyAuthChoiceOAuth } from './auth-choice.apply.oauth';
import { applyAuthChoiceOpenAI } from './auth-choice.apply.openai';
import { applyAuthChoiceQwenPortal } from './auth-choice.apply.qwen-portal';
import { applyAuthChoiceVllm } from './auth-choice.apply.vllm';
import { applyAuthChoiceXAI } from './auth-choice.apply.xai';
import type { AuthChoice } from './onboard-types';

export type ApplyAuthChoiceParams = {
  authChoice: AuthChoice;
  config: PowerDirectorConfig;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
  agentDir?: string;
  setDefaultModel: boolean;
  agentId?: string;
  opts?: {
    tokenProvider?: string;
    token?: string;
    cloudflareAiGatewayAccountId?: string;
    cloudflareAiGatewayGatewayId?: string;
    cloudflareAiGatewayApiKey?: string;
    xaiApiKey?: string;
  };
};

export type ApplyAuthChoiceResult = {
  config: PowerDirectorConfig;
  agentModelOverride?: string;
};

export async function applyAuthChoice(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult> {
  const handlers: Array<(p: ApplyAuthChoiceParams) => Promise<ApplyAuthChoiceResult | null>> = [
    applyAuthChoiceAnthropic,
    applyAuthChoiceVllm,
    applyAuthChoiceOpenAI,
    applyAuthChoiceOAuth,
    applyAuthChoiceApiProviders,
    applyAuthChoiceMiniMax,
    applyAuthChoiceGitHubCopilot,
    applyAuthChoiceGoogleAntigravity,
    applyAuthChoiceGoogleGeminiCli,
    applyAuthChoiceCopilotProxy,
    applyAuthChoiceQwenPortal,
    applyAuthChoiceXAI,
  ];

  for (const handler of handlers) {
    const result = await handler(params);
    if (result) {
      return result;
    }
  }

  return { config: params.config };
}
