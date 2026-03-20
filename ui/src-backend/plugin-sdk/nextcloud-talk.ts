// Narrow plugin-sdk surface for the bundled nextcloud-talk plugin.
// Keep this list additive and scoped to symbols used under extensions/nextcloud-talk.

export { logInboundDrop } from "../channels/logging";
export { resolveMentionGatingWithBypass } from "../channels/mention-gating";
export type { AllowlistMatch } from "../channels/plugins/allowlist-match";
export {
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatchWithFallback,
  resolveNestedAllowlistDecision,
} from "../channels/plugins/channel-config";
export {
  deleteAccountFromConfigSection,
  clearAccountEntryFields,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export { formatPairingApproveHint } from "../channels/plugins/helpers";
export {
  buildSingleChannelSecretPromptState,
  addWildcardAllowFrom,
  mergeAllowFromEntries,
  promptSingleChannelSecretInput,
  runSingleChannelSecretStep,
  setTopLevelChannelDmPolicyWithAllowFrom,
} from "../channels/plugins/setup-wizard-helpers";
export {
  applyAccountNameToChannelSection,
  patchScopedAccountConfig,
} from "../channels/plugins/setup-helpers";
export { createAccountListHelpers } from "../channels/plugins/account-helpers";
export type { ChannelGroupContext, ChannelSetupInput } from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export { mapAllowFromEntries } from "./channel-config-helpers";
export { evaluateMatchedGroupAccessForPolicy } from "./group-access";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "../config/runtime-group-policy";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyConfig,
} from "../config/types";
export type { SecretInput } from "./secret-input";
export {
  buildSecretInputSchema,
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
} from "./secret-input";
export { ToolPolicySchema } from "../config/zod-schema.agent-runtime";
export {
  BlockStreamingCoalesceSchema,
  DmConfigSchema,
  DmPolicySchema,
  GroupPolicySchema,
  MarkdownConfigSchema,
  ReplyRuntimeConfigSchemaShape,
  requireOpenAllowFrom,
} from "../config/zod-schema.core";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "../infra/http-body";
export { waitForAbortSignal } from "../infra/abort-signal";
export { fetchWithSsrFGuard } from "../infra/net/fetch-guard";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export {
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithCommandGate,
} from "../security/dm-policy-shared";
export { formatDocsLink } from "../terminal/links";
export type { WizardPrompter } from "../wizard/prompts";
export {
  listConfiguredAccountIds,
  resolveAccountWithDefaultFallback,
} from "./account-resolution";
export { createChannelPairingController } from "./channel-pairing";
export { createPersistentDedupe } from "./persistent-dedupe";
export type { OutboundReplyPayload } from "./reply-payload";
export {
  createNormalizedOutboundDeliverer,
  deliverFormattedTextWithAttachments,
  formatTextWithAttachmentLinks,
  resolveOutboundMediaUrls,
} from "./reply-payload";
export { dispatchInboundReplyWithBase } from "./inbound-reply-dispatch";
export { createLoggerBackedRuntime } from "./runtime";
export {
  buildBaseChannelStatusSummary,
  buildRuntimeAccountStatusSnapshot,
} from "./status-helpers";
