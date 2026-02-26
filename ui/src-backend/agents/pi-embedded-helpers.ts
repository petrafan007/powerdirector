export {
  buildBootstrapContextFiles,
  DEFAULT_BOOTSTRAP_MAX_CHARS,
  DEFAULT_BOOTSTRAP_TOTAL_MAX_CHARS,
  ensureSessionHeader,
  resolveBootstrapMaxChars,
  resolveBootstrapTotalMaxChars,
  stripThoughtSignatures,
} from './pi-embedded-helpers/bootstrap';
export {
  BILLING_ERROR_USER_MESSAGE,
  formatBillingErrorMessage,
  classifyFailoverReason,
  formatRawAssistantErrorForUi,
  formatAssistantErrorText,
  getApiErrorPayloadFingerprint,
  isAuthAssistantError,
  isAuthErrorMessage,
  isBillingAssistantError,
  parseApiErrorInfo,
  sanitizeUserFacingText,
  isBillingErrorMessage,
  isCloudflareOrHtmlErrorPage,
  isCloudCodeAssistFormatError,
  isCompactionFailureError,
  isContextOverflowError,
  isLikelyContextOverflowError,
  isFailoverAssistantError,
  isFailoverErrorMessage,
  isImageDimensionErrorMessage,
  isImageSizeError,
  isOverloadedErrorMessage,
  isRawApiErrorPayload,
  isRateLimitAssistantError,
  isRateLimitErrorMessage,
  isTransientHttpError,
  isTimeoutErrorMessage,
  parseImageDimensionError,
  parseImageSizeError,
} from './pi-embedded-helpers/errors';
export { isGoogleModelApi, sanitizeGoogleTurnOrdering } from './pi-embedded-helpers/google';

export { downgradeOpenAIReasoningBlocks } from './pi-embedded-helpers/openai';
export {
  isEmptyAssistantMessageContent,
  sanitizeSessionMessagesImages,
} from './pi-embedded-helpers/images';
export {
  isMessagingToolDuplicate,
  isMessagingToolDuplicateNormalized,
  normalizeTextForComparison,
} from './pi-embedded-helpers/messaging-dedupe';

export { pickFallbackThinkingLevel } from './pi-embedded-helpers/thinking';

export {
  mergeConsecutiveUserTurns,
  validateAnthropicTurns,
  validateGeminiTurns,
} from './pi-embedded-helpers/turns';
export type { EmbeddedContextFile, FailoverReason } from './pi-embedded-helpers/types';

export type { ToolCallIdMode } from './tool-call-id';
export { isValidCloudCodeAssistToolId, sanitizeToolCallId } from './tool-call-id';
