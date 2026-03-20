import { applyAuthProfileConfig, buildApiKeyCredential } from "./provider-auth-helpers";
import {
  ensureApiKeyFromOptionEnvOrPrompt,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./provider-auth-input";
import { applyPrimaryModel } from "./provider-model-primary";

export const providerApiKeyAuthRuntime = {
  applyAuthProfileConfig,
  applyPrimaryModel,
  buildApiKeyCredential,
  ensureApiKeyFromOptionEnvOrPrompt,
  normalizeApiKeyInput,
  validateApiKeyInput,
};
