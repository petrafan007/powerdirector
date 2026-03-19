import { emptyPluginConfigSchema } from "../plugins/config-schema.js";
import type {
  PowerDirectorPluginApi,
  PowerDirectorPluginCommandDefinition,
  PowerDirectorPluginConfigSchema,
  PowerDirectorPluginDefinition,
  PluginInteractiveTelegramHandlerContext,
} from "../plugins/types.js";

export type {
  AnyAgentTool,
  MediaUnderstandingProviderPlugin,
  PowerDirectorPluginApi,
  PowerDirectorPluginConfigSchema,
  ProviderDiscoveryContext,
  ProviderCatalogContext,
  ProviderCatalogResult,
  ProviderAugmentModelCatalogContext,
  ProviderBuiltInModelSuppressionContext,
  ProviderBuiltInModelSuppressionResult,
  ProviderBuildMissingAuthMessageContext,
  ProviderCacheTtlEligibilityContext,
  ProviderDefaultThinkingPolicyContext,
  ProviderFetchUsageSnapshotContext,
  ProviderModernModelPolicyContext,
  ProviderPreparedRuntimeAuth,
  ProviderResolvedUsageAuth,
  ProviderPrepareExtraParamsContext,
  ProviderPrepareDynamicModelContext,
  ProviderPrepareRuntimeAuthContext,
  ProviderResolveUsageAuthContext,
  ProviderResolveDynamicModelContext,
  ProviderNormalizeResolvedModelContext,
  ProviderRuntimeModel,
  SpeechProviderPlugin,
  ProviderThinkingPolicyContext,
  ProviderWrapStreamFnContext,
  PowerDirectorPluginService,
  PowerDirectorPluginServiceContext,
  ProviderAuthContext,
  ProviderAuthDoctorHintContext,
  ProviderAuthMethodNonInteractiveContext,
  ProviderAuthMethod,
  ProviderAuthResult,
  PowerDirectorPluginCommandDefinition,
  PowerDirectorPluginDefinition,
  PluginLogger,
  PluginInteractiveTelegramHandlerContext,
} from "../plugins/types.js";
export type { PowerDirectorConfig } from "../config/config.js";

export { emptyPluginConfigSchema } from "../plugins/config-schema.js";

type DefinePluginEntryOptions = {
  id: string;
  name: string;
  description: string;
  kind?: PowerDirectorPluginDefinition["kind"];
  configSchema?: PowerDirectorPluginConfigSchema | (() => PowerDirectorPluginConfigSchema);
  register: (api: PowerDirectorPluginApi) => void;
};

type DefinedPluginEntry = {
  id: string;
  name: string;
  description: string;
  configSchema: PowerDirectorPluginConfigSchema;
  register: NonNullable<PowerDirectorPluginDefinition["register"]>;
} & Pick<PowerDirectorPluginDefinition, "kind">;

function resolvePluginConfigSchema(
  configSchema: DefinePluginEntryOptions["configSchema"] = emptyPluginConfigSchema,
): PowerDirectorPluginConfigSchema {
  return typeof configSchema === "function" ? configSchema() : configSchema;
}

// Small entry surface for provider and command plugins that do not need channel helpers.
export function definePluginEntry({
  id,
  name,
  description,
  kind,
  configSchema = emptyPluginConfigSchema,
  register,
}: DefinePluginEntryOptions): DefinedPluginEntry {
  return {
    id,
    name,
    description,
    ...(kind ? { kind } : {}),
    configSchema: resolvePluginConfigSchema(configSchema),
    register,
  };
}
