// Narrow plugin-sdk surface for the bundled zalouser plugin.
// Keep this list additive and scoped to symbols used under extensions/zalouser.

import { createOptionalChannelSetupSurface } from "./channel-setup";

export type { ReplyPayload } from "../auto-reply/types";
export { mergeAllowlist, summarizeMapping } from "../channels/allowlists/resolve-utils";
export { resolveMentionGatingWithBypass } from "../channels/mention-gating";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export { formatPairingApproveHint } from "../channels/plugins/helpers";
export {
  addWildcardAllowFrom,
  mergeAllowFromEntries,
  setTopLevelChannelDmPolicyWithAllowFrom,
} from "../channels/plugins/setup-wizard-helpers";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
  patchScopedAccountConfig,
} from "../channels/plugins/setup-helpers";
export { createAccountListHelpers } from "../channels/plugins/account-helpers";
export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionAdapter,
  ChannelStatusIssue,
} from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export { isDangerousNameMatchingEnabled } from "../config/dangerous-name-matching";
export {
  resolveDefaultGroupPolicy,
  resolveOpenProviderRuntimeGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "../config/runtime-group-policy";
export type { GroupToolPolicyConfig, MarkdownTableMode } from "../config/types";
export { ToolPolicySchema } from "../config/zod-schema.agent-runtime";
export { MarkdownConfigSchema } from "../config/zod-schema.core";
export { resolvePreferredPowerDirectorTmpDir } from "../infra/tmp-powerdirector-dir";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { AnyAgentTool, PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export type { WizardPrompter } from "../wizard/prompts";
export { formatAllowFromLowercase } from "./allow-from";
export { resolveSenderCommandAuthorization } from "./command-auth";
export { resolveChannelAccountConfigBasePath } from "./config-paths";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveSenderScopedGroupPolicy,
} from "./group-access";
export { loadOutboundMediaFromUrl } from "./outbound-media";
export { createChannelPairingController } from "./channel-pairing";
export { buildChannelSendResult } from "./channel-send-result";
export type { OutboundReplyPayload } from "./reply-payload";
export {
  deliverTextOrMediaReply,
  isNumericTargetId,
  resolveOutboundMediaUrls,
  resolveSendableOutboundReplyParts,
  sendMediaWithLeadingCaption,
  sendPayloadWithChunkedTextAndMedia,
} from "./reply-payload";
export { formatResolvedUnresolvedNote } from "./resolution-notes";
export { buildBaseAccountStatusSnapshot } from "./status-helpers";
export { chunkTextForOutbound } from "./text-chunking";

const zalouserSetup = createOptionalChannelSetupSurface({
  channel: "zalouser",
  label: "Zalo Personal",
  npmSpec: "@powerdirector/zalouser",
  docsPath: "/channels/zalouser",
});

export const zalouserSetupAdapter = zalouserSetup.setupAdapter;
export const zalouserSetupWizard = zalouserSetup.setupWizard;
