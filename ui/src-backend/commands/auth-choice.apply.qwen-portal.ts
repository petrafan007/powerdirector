import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from './auth-choice.apply';
import { applyAuthChoicePluginProvider } from './auth-choice.apply.plugin-provider';

export async function applyAuthChoiceQwenPortal(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  return await applyAuthChoicePluginProvider(params, {
    authChoice: "qwen-portal",
    pluginId: "qwen-portal-auth",
    providerId: "qwen-portal",
    methodId: "device",
    label: "Qwen",
  });
}
