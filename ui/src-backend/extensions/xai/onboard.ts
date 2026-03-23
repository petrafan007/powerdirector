import {
  applyProviderConfigWithDefaultModelsPreset,
  type PowerDirectorConfig,
} from "powerdirector/plugin-sdk/provider-onboard";
import { XAI_BASE_URL, XAI_DEFAULT_MODEL_ID } from "./model-definitions";
import { buildXaiCatalogModels } from "./model-definitions";

export const XAI_DEFAULT_MODEL_REF = `xai/${XAI_DEFAULT_MODEL_ID}`;

function applyXaiProviderConfigWithApi(
  cfg: PowerDirectorConfig,
  api: "openai-completions" | "openai-responses",
  primaryModelRef?: string,
): PowerDirectorConfig {
  return applyProviderConfigWithDefaultModelsPreset(cfg, {
    providerId: "xai",
    api,
    baseUrl: XAI_BASE_URL,
    defaultModels: buildXaiCatalogModels(),
    defaultModelId: XAI_DEFAULT_MODEL_ID,
    aliases: [{ modelRef: XAI_DEFAULT_MODEL_REF, alias: "Grok" }],
    primaryModelRef,
  });
}

export function applyXaiProviderConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyXaiProviderConfigWithApi(cfg, "openai-completions");
}

export function applyXaiResponsesApiConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyXaiProviderConfigWithApi(cfg, "openai-responses");
}

export function applyXaiConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  return applyXaiProviderConfigWithApi(cfg, "openai-completions", XAI_DEFAULT_MODEL_REF);
}
