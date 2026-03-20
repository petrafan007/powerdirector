// Narrow plugin-sdk surface for MiniMax OAuth helpers used by the bundled minimax plugin.
// Keep this list additive and scoped to MiniMax OAuth support code.

export { definePluginEntry } from "./core";
export { buildOauthProviderAuthResult } from "./provider-auth-result";
export type {
  PowerDirectorPluginApi,
  ProviderAuthContext,
  ProviderCatalogContext,
  ProviderAuthResult,
} from "../plugins/types";
export { generatePkceVerifierChallenge, toFormUrlEncoded } from "./oauth-utils";
