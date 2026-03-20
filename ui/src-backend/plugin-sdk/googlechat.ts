// Narrow plugin-sdk surface for the bundled googlechat plugin.
// Keep this list additive and scoped to symbols used under extensions/googlechat.

import { resolveChannelGroupRequireMention } from "./channel-policy";
import { createOptionalChannelSetupSurface } from "./channel-setup";

export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "../agents/tools/common";
export { resolveMentionGatingWithBypass } from "../channels/mention-gating";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export {
  listDirectoryGroupEntriesFromMapKeys,
  listDirectoryUserEntriesFromAllowFrom,
} from "../channels/plugins/directory-config-helpers";
export { buildComputedAccountStatusSnapshot } from "./status-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export { createAccountStatusSink, runPassiveAccountLifecycle } from "./channel-lifecycle";
export { formatPairingApproveHint } from "../channels/plugins/helpers";
export { resolveChannelMediaMaxBytes } from "../channels/plugins/media-limits";
export {
  addWildcardAllowFrom,
  mergeAllowFromEntries,
  splitSetupEntries,
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
  ChannelAccountSnapshot,
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "../channels/plugins/types";
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
export type { DmPolicy, GoogleChatAccountConfig, GoogleChatConfig } from "../config/types";
export { isSecretRef } from "../config/types.secrets";
export { GoogleChatConfigSchema } from "../config/zod-schema.providers-core";
export { fetchWithSsrFGuard } from "../infra/net/fetch-guard";
export { missingTargetError } from "../infra/outbound/target-errors";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";
export { resolveDmGroupAccessWithLists } from "../security/dm-policy-shared";
export { formatDocsLink } from "../terminal/links";
export type { WizardPrompter } from "../wizard/prompts";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "./inbound-envelope";
export { createChannelPairingController } from "./channel-pairing";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveSenderScopedGroupPolicy,
} from "./group-access";
export { extractToolSend } from "./tool-send";
export {
  beginWebhookRequestPipelineOrReject,
  createWebhookInFlightLimiter,
  readJsonWebhookBodyOrReject,
  registerWebhookTargetWithPluginRoute,
  resolveWebhookPath,
  resolveWebhookTargetWithAuthOrReject,
  resolveWebhookTargets,
  type WebhookInFlightLimiter,
  withResolvedWebhookRequestPipeline,
} from "./webhook-ingress";

type GoogleChatGroupContext = {
  cfg: import("../config/config").PowerDirectorConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveGoogleChatGroupRequireMention(params: GoogleChatGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "googlechat",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}

const googlechatSetup = createOptionalChannelSetupSurface({
  channel: "googlechat",
  label: "Google Chat",
  npmSpec: "@powerdirector/googlechat",
  docsPath: "/channels/googlechat",
});

export const googlechatSetupAdapter = googlechatSetup.setupAdapter;
export const googlechatSetupWizard = googlechatSetup.setupWizard;
