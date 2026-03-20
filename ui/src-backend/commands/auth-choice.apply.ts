import type { PowerDirectorConfig } from "../config/config";
import { applyAuthChoiceLoadedPluginProvider } from "../plugins/provider-auth-choice";
import type { RuntimeEnv } from "../runtime";
import type { WizardPrompter } from "../wizard/prompts";
import { normalizeLegacyOnboardAuthChoice } from "./auth-choice-legacy";
import { applyAuthChoiceApiProviders } from "./auth-choice.apply.api-providers";
import { normalizeApiKeyTokenProviderAuthChoice } from "./auth-choice.apply.api-providers";
import { applyAuthChoiceOAuth } from "./auth-choice.apply.oauth";
import type { AuthChoice, OnboardOptions } from "./onboard-types";

export type ApplyAuthChoiceParams = {
  authChoice: AuthChoice;
  config: PowerDirectorConfig;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
  agentDir?: string;
  setDefaultModel: boolean;
  agentId?: string;
  opts?: Partial<OnboardOptions>;
};

export type ApplyAuthChoiceResult = {
  config: PowerDirectorConfig;
  agentModelOverride?: string;
};

export async function applyAuthChoice(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult> {
  const normalizedAuthChoice =
    normalizeLegacyOnboardAuthChoice(params.authChoice) ?? params.authChoice;
  const normalizedProviderAuthChoice = normalizeApiKeyTokenProviderAuthChoice({
    authChoice: normalizedAuthChoice,
    tokenProvider: params.opts?.tokenProvider,
    config: params.config,
    env: process.env,
  });
  const normalizedParams =
    normalizedProviderAuthChoice === params.authChoice
      ? params
      : { ...params, authChoice: normalizedProviderAuthChoice };
  const handlers: Array<(p: ApplyAuthChoiceParams) => Promise<ApplyAuthChoiceResult | null>> = [
    applyAuthChoiceLoadedPluginProvider,
    applyAuthChoiceOAuth,
    applyAuthChoiceApiProviders,
  ];

  for (const handler of handlers) {
    const result = await handler(normalizedParams);
    if (result) {
      return result;
    }
  }

  return { config: normalizedParams.config };
}
