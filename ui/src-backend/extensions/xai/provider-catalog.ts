import type { ModelProviderConfig } from "powerdirector/plugin-sdk/provider-models";
import { buildXaiCatalogModels, XAI_BASE_URL } from "./model-definitions";

export function buildXaiProvider(
  api: ModelProviderConfig["api"] = "openai-completions",
): ModelProviderConfig {
  return {
    baseUrl: XAI_BASE_URL,
    api,
    models: buildXaiCatalogModels(),
  };
}
