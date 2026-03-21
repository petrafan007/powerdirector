// Narrow plugin-sdk surface for the bundled bluebubbles plugin.
// Keep this list additive and scoped to symbols used under extensions/bluebubbles.

export { resolveAckReaction } from "../agents/identity";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "../agents/tools/common";
export type { HistoryEntry } from "../auto-reply/reply/history";
export {
  evictOldHistoryKeys,
  recordPendingHistoryEntryIfEnabled,
} from "../auto-reply/reply/history";
export { resolveControlCommandGate } from "../channels/command-gating";
export { logAckFailure, logInboundDrop, logTypingFailure } from "../channels/logging";
export {
  BLUEBUBBLES_ACTION_NAMES,
  BLUEBUBBLES_ACTIONS,
} from "../channels/plugins/bluebubbles-actions";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export {
  resolveBlueBubblesGroupRequireMention,
  resolveBlueBubblesGroupToolPolicy,
} from "powerdirector/extensions/bluebubbles/runtime-api";
export { formatPairingApproveHint } from "../channels/plugins/helpers";
export { resolveChannelMediaMaxBytes } from "../channels/plugins/media-limits";
export {
  addWildcardAllowFrom,
  mergeAllowFromEntries,
  setTopLevelChannelDmPolicyWithAllowFrom,
} from "../channels/plugins/setup-wizard-helpers";
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message";
export {
  applyAccountNameToChannelSection,
  migrateBaseNameToDefaultAccount,
  patchScopedAccountConfig,
} from "../channels/plugins/setup-helpers";
export { createAccountListHelpers } from "../channels/plugins/account-helpers";
export { collectBlueBubblesStatusIssues } from "../channels/plugins/status-issues/bluebubbles";
export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
} from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export type { DmPolicy, GroupPolicy } from "../config/types";
export { ToolPolicySchema } from "../config/zod-schema.agent-runtime";
export { MarkdownConfigSchema } from "../config/zod-schema.core";
export type { ParsedChatTarget } from "powerdirector/extensions/imessage/api";
export {
  parseChatAllowTargetPrefixes,
  parseChatTargetPrefixesOrThrow,
  resolveServicePrefixedAllowTarget,
  resolveServicePrefixedTarget,
} from "powerdirector/extensions/imessage/api";
export { stripMarkdown } from "../line/markdown-to-line";
export { parseFiniteNumber } from "../infra/parse-finite-number";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";
export {
  DM_GROUP_ACCESS_REASON,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
} from "../security/dm-policy-shared";
export { formatDocsLink } from "../terminal/links";
export type { WizardPrompter } from "../wizard/prompts";
export { isAllowedParsedChatSender } from "./allow-from";
export { readBooleanParam } from "./boolean-param";
export { mapAllowFromEntries } from "./channel-config-helpers";
export { createChannelPairingController } from "./channel-pairing";
export { resolveRequestUrl } from "./request-url";
export {
  buildComputedAccountStatusSnapshot,
  buildProbeChannelStatusSummary,
} from "./status-helpers";
export { extractToolSend } from "./tool-send";
export {
  createWebhookInFlightLimiter,
  normalizeWebhookPath,
  readWebhookBodyOrReject,
  registerWebhookTargetWithPluginRoute,
  resolveWebhookTargets,
  resolveWebhookTargetWithAuthOrRejectSync,
  withResolvedWebhookRequestPipeline,
} from "./webhook-ingress";
