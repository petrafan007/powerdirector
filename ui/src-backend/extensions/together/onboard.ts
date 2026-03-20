import {
  buildTogetherModelDefinition,
  TOGETHER_BASE_URL,
  TOGETHER_MODEL_CATALOG,
} from "@/src-backend/plugin-sdk/provider-models";
import {
  applyProviderConfigWithModelCatalogPreset,
  type PowerDirectorConfig,
} from "@/src-backend/plugin-sdk/provider-onboard";

export const TOGETHER_DEFAULT_MODEL_REF = "together/moonshotai/Kimi-K2.5";

function applyTogetherPreset(cfg: PowerDirectorConfig, primaryModelRef?: string): PowerDirectorConfig {
  return applyProviderConfigWithModelCatalogPreset(cfg, {
    providerId: "together",
    api: "openai-completions",
    baseUrl: TOGETHER_BASE_URL,
    catalogModels: TOGETHER_MODEL_CATALOG.map(buildTogetherModelDefinition),
    aliases: [{ modelRef: TOGETHER_DEFAULT_MODEL_REF, alias: "Together AI" }],
    primaryModelRef,
  });
}

export function applyTogetherProviderConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyTogetherPreset(cfg);
}

export function applyTogetherConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyTogetherPreset(cfg, TOGETHER_DEFAULT_MODEL_REF);
}
