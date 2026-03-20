// Narrow plugin-sdk surface for the bundled qwen-portal-auth plugin.
// Keep this list additive and scoped to symbols used under extensions/qwen-portal-auth.

export { definePluginEntry } from "./core";
export { buildOauthProviderAuthResult } from "./provider-auth-result";
export type {
  PowerDirectorPluginApi,
  ProviderAuthContext,
  ProviderCatalogContext,
} from "../plugins/types";
export { ensureAuthProfileStore, listProfilesForProvider } from "../agents/auth-profiles";
export { QWEN_OAUTH_MARKER } from "../agents/model-auth-markers";
export { refreshQwenPortalCredentials } from "../providers/qwen-portal-oauth";
export { generatePkceVerifierChallenge, toFormUrlEncoded } from "./oauth-utils";
