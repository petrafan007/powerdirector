export type { IMessageAccountConfig } from "../config/types";
export type { PowerDirectorConfig } from "../config/config";
export type {
  ChannelMessageActionContext,
  ChannelPlugin,
  PowerDirectorPluginApi,
  PluginRuntime,
} from "./channel-plugin-common";
export {
  DEFAULT_ACCOUNT_ID,
  PAIRING_APPROVED_MESSAGE,
  applyAccountNameToChannelSection,
  buildChannelConfigSchema,
  deleteAccountFromConfigSection,
  emptyPluginConfigSchema,
  formatPairingApproveHint,
  getChatChannelMeta,
  migrateBaseNameToDefaultAccount,
  normalizeAccountId,
  setAccountEnabledInConfigSection,
} from "./channel-plugin-common";
export { detectBinary } from "../plugins/setup-binary";
export { formatDocsLink } from "../terminal/links";
export {
  formatTrimmedAllowFromEntries,
  resolveIMessageConfigAllowFrom,
  resolveIMessageConfigDefaultTo,
} from "./channel-config-helpers";
export {
  looksLikeIMessageTargetId,
  normalizeIMessageMessagingTarget,
} from "../channels/plugins/normalize/imessage";

export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
} from "../config/runtime-group-policy";
export {
  resolveIMessageGroupRequireMention,
  resolveIMessageGroupToolPolicy,
} from "@/src-backend/extensions/imessage/api";
export { IMessageConfigSchema } from "../config/zod-schema.providers-core";

export { resolveChannelMediaMaxBytes } from "../channels/plugins/media-limits";
export { collectStatusIssuesFromLastError } from "./status-helpers";
export {
  monitorIMessageProvider,
  probeIMessage,
  sendMessageIMessage,
} from "@/src-backend/extensions/imessage/runtime-api";
