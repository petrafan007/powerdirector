export type { SignalAccountConfig } from "../config/types";
export type { ChannelPlugin } from "./channel-plugin-common";
export {
  DEFAULT_ACCOUNT_ID,
  PAIRING_APPROVED_MESSAGE,
  buildChannelConfigSchema,
  deleteAccountFromConfigSection,
  getChatChannelMeta,
  setAccountEnabledInConfigSection,
} from "./channel-plugin-common";
export { SignalConfigSchema } from "../config/zod-schema.providers-core";
export {
  looksLikeSignalTargetId,
  normalizeSignalMessagingTarget,
} from "../channels/plugins/normalize/signal";
export { resolveChannelMediaMaxBytes } from "../channels/plugins/media-limits";
export { normalizeE164 } from "../utils";
export {
  buildBaseAccountStatusSnapshot,
  buildBaseChannelStatusSummary,
  collectStatusIssuesFromLastError,
  createDefaultChannelRuntimeState,
} from "./status-helpers";
