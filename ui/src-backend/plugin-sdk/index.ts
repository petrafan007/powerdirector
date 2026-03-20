// Shared root plugin-sdk surface.
// Keep this entry intentionally tiny. Channel/provider helpers belong on
// dedicated subpaths or, for legacy consumers, the compat surface.

export type {
  ChannelAccountSnapshot,
  ChannelAgentTool,
  ChannelAgentToolFactory,
  ChannelCapabilities,
  ChannelGatewayContext,
  ChannelId,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "../channels/plugins/types";
export type {
  ChannelConfiguredBindingConversationRef,
  ChannelConfiguredBindingMatch,
  ChannelConfiguredBindingProvider,
} from "../channels/plugins/types.adapters";
export type { ChannelConfigSchema, ChannelPlugin } from "../channels/plugins/types.plugin";
export type { ChannelSetupAdapter, ChannelSetupInput } from "../channels/plugins/types";
export type {
  ConfiguredBindingConversation,
  ConfiguredBindingResolution,
  CompiledConfiguredBinding,
  StatefulBindingTargetDescriptor,
} from "../channels/plugins/binding-types";
export type {
  StatefulBindingTargetDriver,
  StatefulBindingTargetReadyResult,
  StatefulBindingTargetResetResult,
  StatefulBindingTargetSessionResult,
} from "../channels/plugins/stateful-target-drivers";
export type {
  ChannelSetupWizard,
  ChannelSetupWizardAllowFromEntry,
} from "../channels/plugins/setup-wizard";
export type {
  AnyAgentTool,
  MediaUnderstandingProviderPlugin,
  PowerDirectorPluginApi,
  PowerDirectorPluginConfigSchema,
  PluginLogger,
  ProviderAuthContext,
  ProviderAuthResult,
  ProviderRuntimeModel,
  SpeechProviderPlugin,
} from "../plugins/types";
export type {
  PluginRuntime,
  RuntimeLogger,
  SubagentRunParams,
  SubagentRunResult,
} from "../plugins/runtime/types";
export type { PowerDirectorConfig } from "../config/config";
/** @deprecated Use PowerDirectorConfig instead */
export type { PowerDirectorConfig as ClawdbotConfig } from "../config/config";
export * from "./image-generation";
export type { SecretInput, SecretRef } from "../config/types.secrets";
export type { RuntimeEnv } from "../runtime";
export type { HookEntry } from "../hooks/types";
export type { ReplyPayload } from "../auto-reply/types";
export type { WizardPrompter } from "../wizard/prompts";
export type { ContextEngineFactory } from "../context-engine/registry";

export { emptyPluginConfigSchema } from "../plugins/config-schema";
export { registerContextEngine } from "../context-engine/registry";
export { delegateCompactionToRuntime } from "../context-engine/delegate";
