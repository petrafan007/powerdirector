// Narrow plugin-sdk surface for the bundled google-gemini-cli-auth plugin.
// Keep this list additive and scoped to symbols used under extensions/google-gemini-cli-auth.

export { fetchWithSsrFGuard } from "../infra/net/fetch-guard";
export { isWSL2Sync } from "../infra/wsl";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PowerDirectorPluginApi, ProviderAuthContext } from "../plugins/types";
export { buildOauthProviderAuthResult } from "./provider-auth-result";
