// Public config patch helpers for provider onboarding flows.

export type { PowerDirectorConfig } from "../config/config";
export type {
  ModelApi,
  ModelDefinitionConfig,
  ModelProviderConfig,
} from "../config/types.models";
export {
  applyAgentDefaultModelPrimary,
  applyOnboardAuthAgentModelsAndProviders,
  applyProviderConfigWithDefaultModelPreset,
  applyProviderConfigWithDefaultModelsPreset,
  applyProviderConfigWithDefaultModel,
  applyProviderConfigWithDefaultModels,
  applyProviderConfigWithModelCatalogPreset,
  applyProviderConfigWithModelCatalog,
  withAgentModelAliases,
} from "../plugins/provider-onboarding-config";
export type { AgentModelAliasEntry } from "../plugins/provider-onboarding-config";
export { ensureModelAllowlistEntry } from "../plugins/provider-model-allowlist";
