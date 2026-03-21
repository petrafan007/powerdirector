// Narrow plugin-sdk surface for the bundled synology-chat plugin.
// Keep this list additive and scoped to symbols used under extensions/synology-chat.

export { setAccountEnabledInConfigSection } from "../channels/plugins/config-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export type { ChannelSetupAdapter } from "../channels/plugins/types.adapters";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "../infra/http-body";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export { registerPluginHttpRoute } from "../plugins/http-registry";
export type { PowerDirectorConfig } from "../config/config";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { DEFAULT_ACCOUNT_ID } from "../routing/session-key";
export type { FixedWindowRateLimiter } from "./webhook-memory-guards";
export { createFixedWindowRateLimiter } from "./webhook-memory-guards";
export {
  synologyChatSetupAdapter,
  synologyChatSetupWizard,
} from "powerdirector/extensions/synology-chat/setup-api";
