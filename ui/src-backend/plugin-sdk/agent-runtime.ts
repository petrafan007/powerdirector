// Public agent/model/runtime helpers for plugins that integrate with core agent flows.

export * from "../agents/agent-scope";
export * from "../agents/current-time";
export * from "../agents/date-time";
export * from "../agents/defaults";
export * from "../agents/identity-avatar";
export * from "../agents/identity";
export * from "../agents/model-auth-markers";
export * from "../agents/model-auth";
export * from "../agents/model-catalog";
export * from "../agents/model-selection";
export * from "../agents/pi-embedded-block-chunker";
export * from "../agents/pi-embedded-utils";
export * from "../agents/provider-id";
export * from "../agents/sandbox-paths";
export * from "../agents/schema/typebox";
export * from "../agents/sglang-defaults";
export * from "../agents/tools/common";
export * from "../agents/tools/web-guarded-fetch";
export * from "../agents/tools/web-shared";
export * from "../agents/tools/web-fetch-utils";
export * from "../agents/vllm-defaults";
// Intentional public runtime surface: channel plugins use ingress agent helpers directly.
export * from "../agents/agent-command";
export * from "../tts/tts";

export {
  CLAUDE_CLI_PROFILE_ID,
  CODEX_CLI_PROFILE_ID,
  dedupeProfileIds,
  listProfilesForProvider,
  markAuthProfileGood,
  setAuthProfileOrder,
  upsertAuthProfile,
  upsertAuthProfileWithLock,
  repairOAuthProfileIdMismatch,
  suggestOAuthProfileIdForLegacyDefault,
  clearRuntimeAuthProfileStoreSnapshots,
  ensureAuthProfileStore,
  loadAuthProfileStoreForSecretsRuntime,
  loadAuthProfileStoreForRuntime,
  replaceRuntimeAuthProfileStoreSnapshots,
  loadAuthProfileStore,
  saveAuthProfileStore,
  calculateAuthProfileCooldownMs,
  clearAuthProfileCooldown,
  clearExpiredCooldowns,
  getSoonestCooldownExpiry,
  isProfileInCooldown,
  markAuthProfileCooldown,
  markAuthProfileFailure,
  markAuthProfileUsed,
  resolveProfilesUnavailableReason,
  resolveProfileUnusableUntilForDisplay,
  resolveApiKeyForProfile,
  resolveAuthProfileDisplayLabel,
  formatAuthDoctorHint,
  resolveAuthProfileEligibility,
  resolveAuthProfileOrder,
  resolveAuthStorePathForDisplay,
} from "../agents/auth-profiles";
export type {
  ApiKeyCredential,
  AuthCredentialReasonCode,
  AuthProfileCredential,
  AuthProfileEligibilityReasonCode,
  AuthProfileFailureReason,
  AuthProfileIdRepairResult,
  AuthProfileStore,
  OAuthCredential,
  ProfileUsageStats,
  TokenCredential,
  TokenExpiryState,
} from "../agents/auth-profiles";
