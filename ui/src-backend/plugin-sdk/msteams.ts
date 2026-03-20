// Narrow plugin-sdk surface for the bundled msteams plugin.
// Keep this list additive and scoped to symbols used under extensions/msteams.

import { createOptionalChannelSetupSurface } from "./channel-setup";

export type { ChunkMode } from "../auto-reply/chunk";
export type { HistoryEntry } from "../auto-reply/reply/history";
export {
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  DEFAULT_GROUP_HISTORY_LIMIT,
  recordPendingHistoryEntryIfEnabled,
} from "../auto-reply/reply/history";
export { isSilentReplyText, SILENT_REPLY_TOKEN } from "../auto-reply/tokens";
export type { ReplyPayload } from "../auto-reply/types";
export { mergeAllowlist, summarizeMapping } from "../channels/allowlists/resolve-utils";
export {
  resolveControlCommandGate,
  resolveDualTextControlCommandGate,
} from "../channels/command-gating";
export { logInboundDrop, logTypingFailure } from "../channels/logging";
export { resolveMentionGating } from "../channels/mention-gating";
export type { AllowlistMatch } from "../channels/plugins/allowlist-match";
export {
  formatAllowlistMatchMeta,
  resolveAllowlistMatchSimple,
} from "../channels/plugins/allowlist-match";
export {
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatchWithFallback,
  resolveNestedAllowlistDecision,
} from "../channels/plugins/channel-config";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export { resolveChannelMediaMaxBytes } from "../channels/plugins/media-limits";
export { buildMediaPayload } from "../channels/plugins/media-payload";
export {
  addWildcardAllowFrom,
  mergeAllowFromEntries,
  setTopLevelChannelAllowFrom,
  setTopLevelChannelDmPolicyWithAllowFrom,
  setTopLevelChannelGroupPolicy,
  splitSetupEntries,
} from "../channels/plugins/setup-wizard-helpers";
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message";
export { resolveOutboundMediaUrls, resolveSendableOutboundReplyParts } from "./reply-payload";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelOutboundAdapter,
} from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export { isDangerousNameMatchingEnabled } from "../config/dangerous-name-matching";
export { resolveToolsBySender } from "../config/group-policy";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
} from "../config/runtime-group-policy";
export type {
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyConfig,
  MarkdownTableMode,
  MSTeamsChannelConfig,
  MSTeamsConfig,
  MSTeamsReplyStyle,
  MSTeamsTeamConfig,
} from "../config/types";
export {
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
} from "../config/types.secrets";
export { MSTeamsConfigSchema } from "../config/zod-schema.providers-core";
export { DEFAULT_WEBHOOK_MAX_BODY_BYTES } from "../infra/http-body";
export { fetchWithSsrFGuard } from "../infra/net/fetch-guard";
export type { SsrFPolicy } from "../infra/net/ssrf";
export { isPrivateIpAddress } from "../infra/net/ssrf";
export { detectMime, extensionForMime, getFileExtension } from "../media/mime";
export { extractOriginalFilename } from "../media/store";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID } from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export {
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
} from "../security/dm-policy-shared";
export {
  evaluateSenderGroupAccessForPolicy,
  resolveSenderScopedGroupPolicy,
} from "./group-access";
export { formatDocsLink } from "../terminal/links";
export { sleep } from "../utils";
export { loadWebMedia } from "./web-media";
export type { WizardPrompter } from "../wizard/prompts";
export { keepHttpServerTaskAlive } from "./channel-lifecycle";
export { withFileLock } from "./file-lock";
export { dispatchReplyFromConfigWithSettledDispatcher } from "./inbound-reply-dispatch";
export { readJsonFileWithFallback, writeJsonFileAtomically } from "./json-store";
export { loadOutboundMediaFromUrl } from "./outbound-media";
export { createChannelPairingController } from "./channel-pairing";
export { resolveInboundSessionEnvelopeContext } from "../channels/session-envelope";
export {
  buildHostnameAllowlistPolicyFromSuffixAllowlist,
  isHttpsUrlAllowedByHostnameSuffixAllowlist,
  normalizeHostnameSuffixAllowlist,
} from "./ssrf-policy";
export {
  buildBaseChannelStatusSummary,
  buildProbeChannelStatusSummary,
  buildRuntimeAccountStatusSnapshot,
  createDefaultChannelRuntimeState,
} from "./status-helpers";
export { normalizeStringEntries } from "../shared/string-normalization";

const msteamsSetup = createOptionalChannelSetupSurface({
  channel: "msteams",
  label: "Microsoft Teams",
  npmSpec: "@powerdirector/msteams",
  docsPath: "/channels/msteams",
});

export const msteamsSetupWizard = msteamsSetup.setupWizard;
export const msteamsSetupAdapter = msteamsSetup.setupAdapter;
