import {
  applyProviderConfigWithDefaultModelPreset,
  type PowerDirectorConfig,
} from "powerdirector/plugin-sdk/provider-onboard";
import {
  buildMistralModelDefinition,
  MISTRAL_BASE_URL,
  MISTRAL_DEFAULT_MODEL_ID,
} from "./model-definitions";

export const MISTRAL_DEFAULT_MODEL_REF = `mistral/${MISTRAL_DEFAULT_MODEL_ID}`;

function applyMistralPreset(cfg: PowerDirectorConfig, primaryModelRef?: string): PowerDirectorConfig {
  return applyProviderConfigWithDefaultModelPreset(cfg, {
    providerId: "mistral",
    api: "openai-completions",
    baseUrl: MISTRAL_BASE_URL,
    defaultModel: buildMistralModelDefinition(),
    defaultModelId: MISTRAL_DEFAULT_MODEL_ID,
    aliases: [{ modelRef: MISTRAL_DEFAULT_MODEL_REF, alias: "Mistral" }],
    primaryModelRef,
  });
}

export function applyMistralProviderConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyMistralPreset(cfg);
}

export function applyMistralConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyMistralPreset(cfg, MISTRAL_DEFAULT_MODEL_REF);
}
