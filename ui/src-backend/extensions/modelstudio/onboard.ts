import {
  applyProviderConfigWithModelCatalogPreset,
  type PowerDirectorConfig,
} from "powerdirector/plugin-sdk/provider-onboard";
import {
  MODELSTUDIO_CN_BASE_URL,
  MODELSTUDIO_DEFAULT_MODEL_REF,
  MODELSTUDIO_GLOBAL_BASE_URL,
} from "./model-definitions";
import { buildModelStudioProvider } from "./provider-catalog";

export { MODELSTUDIO_CN_BASE_URL, MODELSTUDIO_DEFAULT_MODEL_REF, MODELSTUDIO_GLOBAL_BASE_URL };

function applyModelStudioProviderConfigWithBaseUrl(
  cfg: PowerDirectorConfig,
  baseUrl: string,
  primaryModelRef?: string,
): PowerDirectorConfig {
  const provider = buildModelStudioProvider();
  return applyProviderConfigWithModelCatalogPreset(cfg, {
    providerId: "modelstudio",
    api: provider.api ?? "openai-completions",
    baseUrl,
    catalogModels: provider.models ?? [],
    aliases: [
      ...(provider.models ?? []).map((model) => `modelstudio/${model.id}`),
      { modelRef: MODELSTUDIO_DEFAULT_MODEL_REF, alias: "Qwen" },
    ],
    primaryModelRef,
  });
}

export function applyModelStudioProviderConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyModelStudioProviderConfigWithBaseUrl(cfg, MODELSTUDIO_GLOBAL_BASE_URL);
}

export function applyModelStudioProviderConfigCn(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyModelStudioProviderConfigWithBaseUrl(cfg, MODELSTUDIO_CN_BASE_URL);
}

export function applyModelStudioConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyModelStudioProviderConfigWithBaseUrl(
    cfg,
    MODELSTUDIO_GLOBAL_BASE_URL,
    MODELSTUDIO_DEFAULT_MODEL_REF,
  );
}

export function applyModelStudioConfigCn(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyModelStudioProviderConfigWithBaseUrl(
    cfg,
    MODELSTUDIO_CN_BASE_URL,
    MODELSTUDIO_DEFAULT_MODEL_REF,
  );
}
