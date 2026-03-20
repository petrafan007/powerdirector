// Narrow plugin-sdk surface for the bundled matrix plugin.
// Keep this list additive and scoped to symbols used under extensions/matrix.

import { createOptionalChannelSetupSurface } from "./channel-setup";

export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "../agents/tools/common";
export type { ReplyPayload } from "../auto-reply/types";
export {
  compileAllowlist,
  resolveCompiledAllowlistMatch,
  resolveAllowlistCandidates,
  resolveAllowlistMatchByCandidates,
} from "../channels/allowlist-match";
export { mergeAllowlist, summarizeMapping } from "../channels/allowlists/resolve-utils";
export { resolveControlCommandGate } from "../channels/command-gating";
export type { NormalizedLocation } from "../channels/location";
export { formatLocationText, toLocationContext } from "../channels/location";
export { logInboundDrop, logTypingFailure } from "../channels/logging";
export type { AllowlistMatch } from "../channels/plugins/allowlist-match";
export { formatAllowlistMatchMeta } from "../channels/plugins/allowlist-match";
export {
  buildChannelKeyCandidates,
  resolveChannelEntryMatch,
} from "../channels/plugins/channel-config";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export { formatPairingApproveHint } from "../channels/plugins/helpers";
export {
  buildSingleChannelSecretPromptState,
  addWildcardAllowFrom,
  mergeAllowFromEntries,
  promptSingleChannelSecretInput,
  setTopLevelChannelGroupPolicy,
} from "../channels/plugins/setup-wizard-helpers";
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message";
export { applyAccountNameToChannelSection } from "../channels/plugins/setup-helpers";
export { createAccountListHelpers } from "../channels/plugins/account-helpers";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMessageActionName,
  ChannelOutboundAdapter,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelToolSend,
} from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "../config/runtime-group-policy";
export type {
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyConfig,
  MarkdownTableMode,
} from "../config/types";
export type { SecretInput } from "./secret-input";
export {
  buildSecretInputSchema,
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
} from "./secret-input";
export { ToolPolicySchema } from "../config/zod-schema.agent-runtime";
export { MarkdownConfigSchema } from "../config/zod-schema.core";
export { fetchWithSsrFGuard } from "../infra/net/fetch-guard";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime, RuntimeLogger } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export type { PollInput } from "../polls";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export {
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
} from "../security/dm-policy-shared";
export { formatDocsLink } from "../terminal/links";
export { normalizeStringEntries } from "../shared/string-normalization";
export type { WizardPrompter } from "../wizard/prompts";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveSenderScopedGroupPolicy,
} from "./group-access";
export { createChannelPairingController } from "./channel-pairing";
export { formatResolvedUnresolvedNote } from "./resolution-notes";
export { runPluginCommandWithTimeout } from "./run-command";
export { dispatchReplyFromConfigWithSettledDispatcher } from "./inbound-reply-dispatch";
export { createLoggerBackedRuntime, resolveRuntimeEnv } from "./runtime";
export { resolveInboundSessionEnvelopeContext } from "../channels/session-envelope";
export {
  buildProbeChannelStatusSummary,
  collectStatusIssuesFromLastError,
} from "./status-helpers";

const matrixSetup = createOptionalChannelSetupSurface({
  channel: "matrix",
  label: "Matrix",
  npmSpec: "@powerdirector/matrix",
  docsPath: "/channels/matrix",
});

export const matrixSetupWizard = matrixSetup.setupWizard;
export const matrixSetupAdapter = matrixSetup.setupAdapter;
