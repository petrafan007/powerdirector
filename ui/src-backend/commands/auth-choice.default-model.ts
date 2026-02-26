import type { PowerDirectorConfig } from '../config/config';
import type { WizardPrompter } from '../wizard/prompts';
import { ensureModelAllowlistEntry } from './model-allowlist';

export async function applyDefaultModelChoice(params: {
  config: PowerDirectorConfig;
  setDefaultModel: boolean;
  defaultModel: string;
  applyDefaultConfig: (config: PowerDirectorConfig) => PowerDirectorConfig;
  applyProviderConfig: (config: PowerDirectorConfig) => PowerDirectorConfig;
  noteDefault?: string;
  noteAgentModel: (model: string) => Promise<void>;
  prompter: WizardPrompter;
}): Promise<{ config: PowerDirectorConfig; agentModelOverride?: string }> {
  if (params.setDefaultModel) {
    const next = params.applyDefaultConfig(params.config);
    if (params.noteDefault) {
      await params.prompter.note(`Default model set to ${params.noteDefault}`, "Model configured");
    }
    return { config: next };
  }

  const next = params.applyProviderConfig(params.config);
  const nextWithModel = ensureModelAllowlistEntry({
    cfg: next,
    modelRef: params.defaultModel,
  });
  await params.noteAgentModel(params.defaultModel);
  return { config: nextWithModel, agentModelOverride: params.defaultModel };
}
