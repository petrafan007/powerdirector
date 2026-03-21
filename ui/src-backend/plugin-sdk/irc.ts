// Narrow plugin-sdk surface for the bundled irc plugin.
// Keep this list additive and scoped to symbols used under extensions/irc.

export { resolveControlCommandGate } from "../channels/command-gating";
export { logInboundDrop } from "../channels/logging";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export { createAccountListHelpers } from "../channels/plugins/account-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export {
  formatPairingApproveHint,
  parseOptionalDelimitedEntries,
} from "../channels/plugins/helpers";
export {
  addWildcardAllowFrom,
  setTopLevelChannelAllowFrom,
  setTopLevelChannelDmPolicyWithAllowFrom,
} from "../channels/plugins/setup-wizard-helpers";
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message";
export { patchScopedAccountConfig } from "../channels/plugins/setup-helpers";
export type { BaseProbeResult } from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { getChatChannelMeta } from "../channels/registry";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export { isDangerousNameMatchingEnabled } from "../config/dangerous-name-matching";
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
  GroupToolPolicyBySenderConfig,
  GroupToolPolicyConfig,
  MarkdownConfig,
} from "../config/types";
export { normalizeResolvedSecretInputString } from "../config/types.secrets";
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
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID } from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export { createAccountStatusSink, runPassiveAccountLifecycle } from "./channel-lifecycle";
export {
  listIrcAccountIds,
  resolveDefaultIrcAccountId,
  resolveIrcAccount,
} from "powerdirector/extensions/irc/api";
export {
  readStoreAllowFromForDmPolicy,
  resolveEffectiveAllowFromLists,
} from "../security/dm-policy-shared";
export { formatDocsLink } from "../terminal/links";
export type { WizardPrompter } from "../wizard/prompts";
export { createChannelPairingController } from "./channel-pairing";
export { dispatchInboundReplyWithBase } from "./inbound-reply-dispatch";
export { ircSetupAdapter, ircSetupWizard } from "powerdirector/extensions/irc/api";
export type { OutboundReplyPayload } from "./reply-payload";
export {
  createNormalizedOutboundDeliverer,
  deliverFormattedTextWithAttachments,
  formatTextWithAttachmentLinks,
  resolveOutboundMediaUrls,
} from "./reply-payload";
export { createLoggerBackedRuntime } from "./runtime";
export { buildBaseAccountStatusSnapshot, buildBaseChannelStatusSummary } from "./status-helpers";
