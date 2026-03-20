// Narrow plugin-sdk surface for the bundled mattermost plugin.
// Keep this list additive and scoped to symbols used under extensions/mattermost.

export { formatInboundFromLabel } from "../auto-reply/envelope";
export type { HistoryEntry } from "../auto-reply/reply/history";
export {
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  DEFAULT_GROUP_HISTORY_LIMIT,
  recordPendingHistoryEntryIfEnabled,
} from "../auto-reply/reply/history";
export { listSkillCommandsForAgents } from "../auto-reply/skill-commands";
export type { ReplyPayload } from "../auto-reply/types";
export type { ChatType } from "../channels/chat-type";
export { resolveControlCommandGate } from "../channels/command-gating";
export { logInboundDrop, logTypingFailure } from "../channels/logging";
export { resolveAllowlistMatchSimple } from "../channels/plugins/allowlist-match";
export { normalizeProviderId } from "../agents/model-selection";
export {
  buildModelsProviderData,
  type ModelsProviderData,
} from "../auto-reply/reply/commands-models";
export { resolveStoredModelOverride } from "../auto-reply/reply/model-selection";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export { formatPairingApproveHint } from "../channels/plugins/helpers";
export { resolveChannelMediaMaxBytes } from "../channels/plugins/media-limits";
export {
  buildSingleChannelSecretPromptState,
  promptSingleChannelSecretInput,
  runSingleChannelSecretStep,
} from "../channels/plugins/setup-wizard-helpers";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
} from "../channels/plugins/setup-helpers";
export { createAccountStatusSink } from "./channel-lifecycle";
export { buildComputedAccountStatusSnapshot } from "./status-helpers";
export { createAccountListHelpers } from "../channels/plugins/account-helpers";
export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelGroupContext,
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
} from "../channels/plugins/types";
export type { ChannelDirectoryEntry } from "../channels/plugins/types.core";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export { isDangerousNameMatchingEnabled } from "../config/dangerous-name-matching";
export { loadSessionStore, resolveStorePath } from "../config/sessions";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "../config/runtime-group-policy";
export type { BlockStreamingCoalesceConfig, DmPolicy, GroupPolicy } from "../config/types";
export {
  BlockStreamingCoalesceSchema,
  DmPolicySchema,
  GroupPolicySchema,
  MarkdownConfigSchema,
  requireOpenAllowFrom,
} from "../config/zod-schema.core";
export { createDedupeCache } from "../infra/dedupe";
export { parseStrictPositiveInteger } from "../infra/parse-finite-number";
export { rawDataToString } from "../infra/ws";
export { isLoopbackHost, isTrustedProxyAddress, resolveClientIp } from "../gateway/net";
export { registerPluginHttpRoute } from "../plugins/http-registry";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  resolveThreadSessionKeys,
} from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export {
  DM_GROUP_ACCESS_REASON,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
} from "../security/dm-policy-shared";
export { evaluateSenderGroupAccessForPolicy } from "./group-access";
export type { WizardPrompter } from "../wizard/prompts";
export { buildAgentMediaPayload } from "./agent-media-payload";
export { getAgentScopedMediaLocalRoots } from "../media/local-roots";
export { loadOutboundMediaFromUrl } from "./outbound-media";
export { createChannelPairingController } from "./channel-pairing";
export { isRequestBodyLimitError, readRequestBodyWithLimit } from "../infra/http-body";
