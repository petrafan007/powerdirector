// Narrow plugin-sdk surface for the bundled tlon plugin.
// Keep this list additive and scoped to symbols used under extensions/tlon.

import { createOptionalChannelSetupSurface } from "./channel-setup";

export type { ReplyPayload } from "../auto-reply/types";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export {
  applyAccountNameToChannelSection,
  patchScopedAccountConfig,
} from "../channels/plugins/setup-helpers";
export type {
  ChannelAccountSnapshot,
  ChannelOutboundAdapter,
  ChannelSetupInput,
} from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export { createDedupeCache } from "../infra/dedupe";
export { fetchWithSsrFGuard } from "../infra/net/fetch-guard";
export type { LookupFn, SsrFPolicy } from "../infra/net/ssrf";
export { isBlockedHostnameOrIp, SsrFBlockedError } from "../infra/net/ssrf";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";
export type { RuntimeEnv } from "../runtime";
export { formatDocsLink } from "../terminal/links";
export type { WizardPrompter } from "../wizard/prompts";
export { createLoggerBackedRuntime } from "./runtime";

const tlonSetup = createOptionalChannelSetupSurface({
  channel: "tlon",
  label: "Tlon",
  npmSpec: "@powerdirector/tlon",
  docsPath: "/channels/tlon",
});

export const tlonSetupAdapter = tlonSetup.setupAdapter;
export const tlonSetupWizard = tlonSetup.setupWizard;
