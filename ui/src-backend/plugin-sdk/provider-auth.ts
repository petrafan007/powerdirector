// Public auth/onboarding helpers for provider plugins.

export type { PowerDirectorConfig } from "../config/config";
export type { SecretInput } from "../config/types.secrets";
export type { ProviderAuthResult } from "../plugins/types";
export type { ProviderAuthContext } from "../plugins/types";
export type { AuthProfileStore, OAuthCredential } from "../agents/auth-profiles/types";
export { buildOauthProviderAuthResult } from "./provider-auth-result";

export {
  CLAUDE_CLI_PROFILE_ID,
  CODEX_CLI_PROFILE_ID,
  ensureAuthProfileStore,
  listProfilesForProvider,
  suggestOAuthProfileIdForLegacyDefault,
  upsertAuthProfile,
} from "../agents/auth-profiles";
export {
  MINIMAX_OAUTH_MARKER,
  resolveOAuthApiKeyMarker,
  resolveNonEnvSecretRefApiKeyMarker,
} from "../agents/model-auth-markers";
export {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "../plugins/provider-auth-input";
export {
  ensureApiKeyFromOptionEnvOrPrompt,
  normalizeSecretInputModeInput,
  promptSecretRefForSetup,
  resolveSecretInputModeForEnvSelection,
} from "../plugins/provider-auth-input";
export {
  buildTokenProfileId,
  validateAnthropicSetupToken,
} from "../plugins/provider-auth-token";
export { applyAuthProfileConfig, buildApiKeyCredential } from "../plugins/provider-auth-helpers";
export { createProviderApiKeyAuthMethod } from "../plugins/provider-api-key-auth";
export { coerceSecretRef } from "../config/types.secrets";
export { resolveDefaultSecretProviderAlias } from "../secrets/ref-contract";
export { resolveRequiredHomeDir } from "../infra/home-dir";
export {
  normalizeOptionalSecretInput,
  normalizeSecretInput,
} from "../utils/normalize-secret-input";
