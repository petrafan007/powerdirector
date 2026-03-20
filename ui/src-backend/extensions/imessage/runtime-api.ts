export {
  DEFAULT_ACCOUNT_ID,
  PAIRING_APPROVED_MESSAGE,
  buildChannelConfigSchema,
  collectStatusIssuesFromLastError,
  formatTrimmedAllowFromEntries,
  getChatChannelMeta,
  looksLikeIMessageTargetId,
  normalizeIMessageMessagingTarget,
  resolveChannelMediaMaxBytes,
  resolveIMessageConfigAllowFrom,
  resolveIMessageConfigDefaultTo,
  IMessageConfigSchema,
  type ChannelPlugin,
  type IMessageAccountConfig,
} from "@/src-backend/plugin-sdk/imessage";
export {
  resolveIMessageGroupRequireMention,
  resolveIMessageGroupToolPolicy,
} from "./src/group-policy";

export { monitorIMessageProvider } from "./src/monitor";
export type { MonitorIMessageOpts } from "./src/monitor";
export { probeIMessage } from "./src/probe";
export { sendMessageIMessage } from "./src/send";
