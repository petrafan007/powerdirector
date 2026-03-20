export {
  buildChannelConfigSchema,
  createActionGate,
  DEFAULT_ACCOUNT_ID,
  formatWhatsAppConfigAllowFromEntries,
  getChatChannelMeta,
  jsonResult,
  normalizeE164,
  readReactionParams,
  readStringParam,
  resolveWhatsAppGroupIntroHint,
  resolveWhatsAppOutboundTarget,
  ToolAuthorizationError,
  WhatsAppConfigSchema,
  type ChannelPlugin,
  type PowerDirectorConfig,
} from "@/src-backend/plugin-sdk/whatsapp-core";

export {
  createWhatsAppOutboundBase,
  isWhatsAppGroupJid,
  normalizeWhatsAppTarget,
  resolveWhatsAppHeartbeatRecipients,
  resolveWhatsAppMentionStripRegexes,
  type ChannelMessageActionName,
  type DmPolicy,
  type GroupPolicy,
  type WhatsAppAccountConfig,
} from "@/src-backend/plugin-sdk/whatsapp-shared";

export { monitorWebChannel } from "./channel.runtime";
