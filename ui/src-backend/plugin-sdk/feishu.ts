// Narrow plugin-sdk surface for the bundled feishu plugin.
// Keep this list additive and scoped to symbols used under extensions/feishu.

export type { HistoryEntry } from "../auto-reply/reply/history";
export {
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  DEFAULT_GROUP_HISTORY_LIMIT,
  recordPendingHistoryEntryIfEnabled,
} from "../auto-reply/reply/history";
export type { ReplyPayload } from "../auto-reply/types";
export { logTypingFailure } from "../channels/logging";
export type { AllowlistMatch } from "../channels/plugins/allowlist-match";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export { createActionGate } from "../agents/tools/common";
export {
  buildSingleChannelSecretPromptState,
  addWildcardAllowFrom,
  mergeAllowFromEntries,
  promptSingleChannelSecretInput,
  setTopLevelChannelAllowFrom,
  setTopLevelChannelDmPolicyWithAllowFrom,
  setTopLevelChannelGroupPolicy,
  splitSetupEntries,
} from "../channels/plugins/setup-wizard-helpers";
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message";
export type {
  BaseProbeResult,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelMeta,
  ChannelOutboundAdapter,
} from "../channels/plugins/types";
export type {
  ChannelConfiguredBindingProvider,
  ChannelConfiguredBindingConversationRef,
  ChannelConfiguredBindingMatch,
} from "../channels/plugins/types.adapters";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createReplyPrefixContext } from "../channels/reply-prefix";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig as ClawdbotConfig, PowerDirectorConfig } from "../config/config";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  resolveOpenProviderRuntimeGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "../config/runtime-group-policy";
export type { DmPolicy, GroupToolPolicyConfig } from "../config/types";
export type { SecretInput } from "./secret-input";
export {
  buildSecretInputSchema,
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
} from "./secret-input";
export { createDedupeCache } from "../infra/dedupe";
export { installRequestBodyLimitGuard, readJsonBodyWithLimit } from "../infra/http-body";
export { fetchWithSsrFGuard } from "../infra/net/fetch-guard";
export { resolveAgentOutboundIdentity } from "../infra/outbound/identity";
export type { OutboundIdentity } from "../infra/outbound/identity";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { AnyAgentTool, PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID, normalizeAgentId } from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export { formatDocsLink } from "../terminal/links";
export { evaluateSenderGroupAccessForPolicy } from "./group-access";
export type { WizardPrompter } from "../wizard/prompts";
export { feishuSetupWizard, feishuSetupAdapter } from "powerdirector/extensions/feishu/setup-api";
export { buildAgentMediaPayload } from "./agent-media-payload";
export { readJsonFileWithFallback } from "./json-store";
export { createChannelPairingController } from "./channel-pairing";
export { createPersistentDedupe } from "./persistent-dedupe";
export {
  buildBaseChannelStatusSummary,
  buildProbeChannelStatusSummary,
  buildRuntimeAccountStatusSnapshot,
  createDefaultChannelRuntimeState,
} from "./status-helpers";
export { withTempDownloadPath } from "./temp-path";
export {
  buildFeishuConversationId,
  parseFeishuConversationId,
} from "powerdirector/extensions/feishu/api";
export {
  createWebhookAnomalyTracker,
  createFixedWindowRateLimiter,
  WEBHOOK_ANOMALY_COUNTER_DEFAULTS,
  WEBHOOK_RATE_LIMIT_DEFAULTS,
} from "./webhook-ingress";
export { applyBasicWebhookRequestGuards } from "./webhook-ingress";
