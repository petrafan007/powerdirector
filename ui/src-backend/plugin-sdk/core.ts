import type {
  ChannelMessagingAdapter,
  ChannelOutboundSessionRoute,
} from "../channels/plugins/types.core";
import type { ChannelPlugin } from "../channels/plugins/types.plugin";
import { getChatChannelMeta } from "../channels/registry";
import type { PowerDirectorConfig } from "../config/config";
import { buildOutboundBaseSessionKey } from "../infra/outbound/base-session-key";
import { emptyPluginConfigSchema } from "../plugins/config-schema";
import type { PluginRuntime } from "../plugins/runtime/types";
import type {
  PowerDirectorPluginApi,
  PowerDirectorPluginCommandDefinition,
  PowerDirectorPluginConfigSchema,
  PowerDirectorPluginDefinition,
  PluginInteractiveTelegramHandlerContext,
} from "../plugins/types";

export type {
  AnyAgentTool,
  MediaUnderstandingProviderPlugin,
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
} from "../plugins/types";
export type { PowerDirectorConfig } from "../config/config";
export { isSecretRef } from "../config/types.secrets";
export type { GatewayRequestHandlerOptions } from "../gateway/server-methods/types";
export type {
  ChannelOutboundSessionRoute,
  ChannelMessagingAdapter,
} from "../channels/plugins/types.core";
export type {
  ProviderUsageSnapshot,
  UsageProviderId,
  UsageWindow,
} from "../infra/provider-usage.types";
export type { ChannelMessageActionContext } from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export type { PowerDirectorPluginApi } from "../plugins/types";
export type { PluginRuntime } from "../plugins/runtime/types";

export { emptyPluginConfigSchema } from "../plugins/config-schema";
export { delegateCompactionToRuntime } from "../context-engine/delegate";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export {
  applyAccountNameToChannelSection,
  migrateBaseNameToDefaultAccount,
} from "../channels/plugins/setup-helpers";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export {
  formatPairingApproveHint,
  parseOptionalDelimitedEntries,
} from "../channels/plugins/helpers";
export { getChatChannelMeta } from "../channels/registry";
export { buildOauthProviderAuthResult } from "./provider-auth-result";
export {
  channelTargetSchema,
  channelTargetsSchema,
  optionalStringEnum,
  stringEnum,
} from "../agents/schema/typebox";
export {
  DEFAULT_SECRET_FILE_MAX_BYTES,
  loadSecretFileSync,
  readSecretFileSync,
  tryReadSecretFileSync,
} from "../infra/secret-file";
export type { SecretFileReadOptions, SecretFileReadResult } from "../infra/secret-file";

export { resolveGatewayBindUrl } from "../shared/gateway-bind-url";
export type { GatewayBindUrlResult } from "../shared/gateway-bind-url";
export { normalizeAtHashSlug, normalizeHyphenSlug } from "../shared/string-normalization";

export { resolveTailnetHostWithRunner } from "../shared/tailscale-status";
export type {
  TailscaleStatusCommandResult,
  TailscaleStatusCommandRunner,
} from "../shared/tailscale-status";
export {
  buildAgentSessionKey,
  type RoutePeer,
  type RoutePeerKind,
} from "../routing/resolve-route";
export { buildOutboundBaseSessionKey } from "../infra/outbound/base-session-key";
export { normalizeOutboundThreadId } from "../infra/outbound/thread-id";
export { resolveThreadSessionKeys } from "../routing/session-key";

export type ChannelOutboundSessionRouteParams = Parameters<
  NonNullable<ChannelMessagingAdapter["resolveOutboundSessionRoute"]>
>[0];

export function stripChannelTargetPrefix(raw: string, ...providers: string[]): string {
  const trimmed = raw.trim();
  for (const provider of providers) {
    const prefix = `${provider.toLowerCase()}:`;
    if (trimmed.toLowerCase().startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim();
    }
  }
  return trimmed;
}

export function stripTargetKindPrefix(raw: string): string {
  return raw.replace(/^(user|channel|group|conversation|room|dm):/i, "").trim();
}

export function buildChannelOutboundSessionRoute(params: {
  cfg: PowerDirectorConfig;
  agentId: string;
  channel: string;
  accountId?: string | null;
  peer: { kind: "direct" | "group" | "channel"; id: string };
  chatType: "direct" | "group" | "channel";
  from: string;
  to: string;
  threadId?: string | number;
}): ChannelOutboundSessionRoute {
  const baseSessionKey = buildOutboundBaseSessionKey({
    cfg: params.cfg,
    agentId: params.agentId,
    channel: params.channel,
    accountId: params.accountId,
    peer: params.peer,
  });
  return {
    sessionKey: baseSessionKey,
    baseSessionKey,
    peer: params.peer,
    chatType: params.chatType,
    from: params.from,
    to: params.to,
    ...(params.threadId !== undefined ? { threadId: params.threadId } : {}),
  };
}

type DefineChannelPluginEntryOptions<TPlugin extends ChannelPlugin = ChannelPlugin> = {
  id: string;
  name: string;
  description: string;
  plugin: TPlugin;
  configSchema?: DefinePluginEntryOptions["configSchema"];
  setRuntime?: (runtime: PluginRuntime) => void;
  registerFull?: (api: PowerDirectorPluginApi) => void;
};

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

type CreateChannelPluginBaseOptions<TResolvedAccount> = {
  id: ChannelPlugin<TResolvedAccount>["id"];
  meta?: Partial<NonNullable<ChannelPlugin<TResolvedAccount>["meta"]>>;
  setupWizard?: NonNullable<ChannelPlugin<TResolvedAccount>["setupWizard"]>;
  capabilities?: ChannelPlugin<TResolvedAccount>["capabilities"];
  agentPrompt?: ChannelPlugin<TResolvedAccount>["agentPrompt"];
  streaming?: ChannelPlugin<TResolvedAccount>["streaming"];
  reload?: ChannelPlugin<TResolvedAccount>["reload"];
  gatewayMethods?: ChannelPlugin<TResolvedAccount>["gatewayMethods"];
  configSchema?: ChannelPlugin<TResolvedAccount>["configSchema"];
  config?: ChannelPlugin<TResolvedAccount>["config"];
  security?: ChannelPlugin<TResolvedAccount>["security"];
  setup: NonNullable<ChannelPlugin<TResolvedAccount>["setup"]>;
  groups?: ChannelPlugin<TResolvedAccount>["groups"];
};

type CreatedChannelPluginBase<TResolvedAccount> = Pick<
  ChannelPlugin<TResolvedAccount>,
  "id" | "meta" | "setup"
> &
  Partial<
    Pick<
      ChannelPlugin<TResolvedAccount>,
      | "setupWizard"
      | "capabilities"
      | "agentPrompt"
      | "streaming"
      | "reload"
      | "gatewayMethods"
      | "configSchema"
      | "config"
      | "security"
      | "groups"
    >
  >;

function resolvePluginConfigSchema(
  configSchema: DefinePluginEntryOptions["configSchema"] = emptyPluginConfigSchema,
): PowerDirectorPluginConfigSchema {
  return typeof configSchema === "function" ? configSchema() : configSchema;
}

// Shared generic plugin-entry boilerplate for bundled and third-party plugins.
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

// Shared channel-plugin entry boilerplate for bundled and third-party channels.
export function defineChannelPluginEntry<TPlugin extends ChannelPlugin>({
  id,
  name,
  description,
  plugin,
  configSchema = emptyPluginConfigSchema,
  setRuntime,
  registerFull,
}: DefineChannelPluginEntryOptions<TPlugin>) {
  return definePluginEntry({
    id,
    name,
    description,
    configSchema,
    register(api: PowerDirectorPluginApi) {
      setRuntime?.(api.runtime);
      api.registerChannel({ plugin });
      if (api.registrationMode !== "full") {
        return;
      }
      registerFull?.(api);
    },
  });
}

// Shared setup-entry shape so bundled channels do not duplicate `{ plugin }`.
export function defineSetupPluginEntry<TPlugin>(plugin: TPlugin) {
  return { plugin };
}

// Shared base object for channel plugins that only need to override a few optional surfaces.
export function createChannelPluginBase<TResolvedAccount>(
  params: CreateChannelPluginBaseOptions<TResolvedAccount>,
): CreatedChannelPluginBase<TResolvedAccount> {
  return {
    id: params.id,
    meta: {
      ...getChatChannelMeta(params.id as Parameters<typeof getChatChannelMeta>[0]),
      ...params.meta,
    },
    ...(params.setupWizard ? { setupWizard: params.setupWizard } : {}),
    ...(params.capabilities ? { capabilities: params.capabilities } : {}),
    ...(params.agentPrompt ? { agentPrompt: params.agentPrompt } : {}),
    ...(params.streaming ? { streaming: params.streaming } : {}),
    ...(params.reload ? { reload: params.reload } : {}),
    ...(params.gatewayMethods ? { gatewayMethods: params.gatewayMethods } : {}),
    ...(params.configSchema ? { configSchema: params.configSchema } : {}),
    ...(params.config ? { config: params.config } : {}),
    ...(params.security ? { security: params.security } : {}),
    ...(params.groups ? { groups: params.groups } : {}),
    setup: params.setup,
  } as CreatedChannelPluginBase<TResolvedAccount>;
}
