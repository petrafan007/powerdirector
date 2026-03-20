// Narrow plugin-sdk surface for the bundled nostr plugin.
// Keep this list additive and scoped to symbols used under extensions/nostr.

import { createOptionalChannelSetupSurface } from "./channel-setup";

export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export type { ChannelSetupAdapter } from "../channels/plugins/types.adapters";
export { formatPairingApproveHint } from "../channels/plugins/helpers";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export type { PowerDirectorConfig } from "../config/config";
export { MarkdownConfigSchema } from "../config/zod-schema.core";
export { readJsonBodyWithLimit, requestBodyErrorToText } from "../infra/http-body";
export { isBlockedHostnameOrIp } from "../infra/net/ssrf";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID } from "../routing/session-key";
export {
  collectStatusIssuesFromLastError,
  createDefaultChannelRuntimeState,
} from "./status-helpers";
export { createFixedWindowRateLimiter } from "./webhook-memory-guards";
export { mapAllowFromEntries } from "./channel-config-helpers";

const nostrSetup = createOptionalChannelSetupSurface({
  channel: "nostr",
  label: "Nostr",
  npmSpec: "@powerdirector/nostr",
  docsPath: "/channels/nostr",
});

export const nostrSetupAdapter = nostrSetup.setupAdapter;
export const nostrSetupWizard = nostrSetup.setupWizard;
