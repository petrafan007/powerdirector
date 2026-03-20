// Narrow plugin-sdk surface for the bundled zalo plugin.
// Keep this list additive and scoped to symbols used under extensions/zalo.

export { jsonResult, readStringParam } from "../agents/tools/common";
export type { ReplyPayload } from "../auto-reply/types";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export { listDirectoryUserEntriesFromAllowFrom } from "../channels/plugins/directory-config-helpers";
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
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
} from "../channels/plugins/setup-helpers";
export { createAccountListHelpers } from "../channels/plugins/account-helpers";
export type {
  BaseProbeResult,
  BaseTokenResolution,
  ChannelAccountSnapshot,
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { logTypingFailure } from "../channels/logging";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export {
  resolveDefaultGroupPolicy,
  resolveOpenProviderRuntimeGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "../config/runtime-group-policy";
export type { GroupPolicy, MarkdownTableMode } from "../config/types";
export type { SecretInput } from "./secret-input";
export {
  buildSecretInputSchema,
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
} from "./secret-input";
export { MarkdownConfigSchema } from "../config/zod-schema.core";
export { waitForAbortSignal } from "../infra/abort-signal";
export { createDedupeCache } from "../infra/dedupe";
export { resolveClientIp } from "../gateway/net";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export type { WizardPrompter } from "../wizard/prompts";
export { formatAllowFromLowercase, isNormalizedSenderAllowed } from "./allow-from";
export { zaloSetupAdapter } from "@/src-backend/extensions/zalo/api";
export { zaloSetupWizard } from "@/src-backend/extensions/zalo/api";
export {
  resolveDirectDmAuthorizationOutcome,
  resolveSenderCommandAuthorizationWithRuntime,
} from "./command-auth";
export { resolveChannelAccountConfigBasePath } from "./config-paths";
export { evaluateSenderGroupAccess } from "./group-access";
export type { SenderGroupAccessDecision } from "./group-access";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "./inbound-envelope";
export { createChannelPairingController } from "./channel-pairing";
export { buildChannelSendResult } from "./channel-send-result";
export type { OutboundReplyPayload } from "./reply-payload";
export {
  deliverTextOrMediaReply,
  isNumericTargetId,
  resolveOutboundMediaUrls,
  sendMediaWithLeadingCaption,
  sendPayloadWithChunkedTextAndMedia,
} from "./reply-payload";
export {
  buildBaseAccountStatusSnapshot,
  buildTokenChannelStatusSummary,
} from "./status-helpers";
export { chunkTextForOutbound } from "./text-chunking";
export { extractToolSend } from "./tool-send";
export {
  applyBasicWebhookRequestGuards,
  createFixedWindowRateLimiter,
  createWebhookAnomalyTracker,
  readJsonWebhookBodyOrReject,
  registerWebhookTarget,
  registerWebhookTargetWithPluginRoute,
  resolveSingleWebhookTarget,
  resolveWebhookPath,
  resolveWebhookTargetWithAuthOrRejectSync,
  resolveWebhookTargets,
  WEBHOOK_ANOMALY_COUNTER_DEFAULTS,
  WEBHOOK_RATE_LIMIT_DEFAULTS,
  withResolvedWebhookRequestPipeline,
} from "./webhook-ingress";
export type {
  RegisterWebhookPluginRouteOptions,
  RegisterWebhookTargetOptions,
} from "./webhook-ingress";
