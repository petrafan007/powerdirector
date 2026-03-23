import {
  buildSyntheticModelDefinition,
  SYNTHETIC_BASE_URL,
  SYNTHETIC_DEFAULT_MODEL_REF,
  SYNTHETIC_MODEL_CATALOG,
} from "powerdirector/plugin-sdk/provider-models";
import {
  applyProviderConfigWithModelCatalogPreset,
  type PowerDirectorConfig,
} from "powerdirector/plugin-sdk/provider-onboard";

export { SYNTHETIC_DEFAULT_MODEL_REF };

function applySyntheticPreset(cfg: PowerDirectorConfig, primaryModelRef?: string): PowerDirectorConfig {
  return applyProviderConfigWithModelCatalogPreset(cfg, {
    providerId: "synthetic",
    api: "anthropic-messages",
    baseUrl: SYNTHETIC_BASE_URL,
    catalogModels: SYNTHETIC_MODEL_CATALOG.map(buildSyntheticModelDefinition),
    aliases: [{ modelRef: SYNTHETIC_DEFAULT_MODEL_REF, alias: "MiniMax M2.5" }],
    primaryModelRef,
  });
}

export function applySyntheticProviderConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applySyntheticPreset(cfg);
}

export function applySyntheticConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applySyntheticPreset(cfg, SYNTHETIC_DEFAULT_MODEL_REF);
}
