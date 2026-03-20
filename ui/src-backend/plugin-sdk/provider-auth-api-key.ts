// Public API-key onboarding helpers for provider plugins.

export type { PowerDirectorConfig } from "../config/config";
export type { SecretInput } from "../config/types.secrets";

export { upsertAuthProfile } from "../agents/auth-profiles";
export {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
  ensureApiKeyFromOptionEnvOrPrompt,
  normalizeSecretInputModeInput,
  promptSecretRefForSetup,
  resolveSecretInputModeForEnvSelection,
} from "../plugins/provider-auth-input";
export { applyAuthProfileConfig, buildApiKeyCredential } from "../plugins/provider-auth-helpers";
export { createProviderApiKeyAuthMethod } from "../plugins/provider-api-key-auth";
export {
  normalizeOptionalSecretInput,
  normalizeSecretInput,
} from "../utils/normalize-secret-input";
