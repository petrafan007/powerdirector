export type { ChannelPlugin } from "./channel-plugin-common";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  deleteAccountFromConfigSection,
  getChatChannelMeta,
  setAccountEnabledInConfigSection,
} from "./channel-plugin-common";
export {
  formatTrimmedAllowFromEntries,
  resolveIMessageConfigAllowFrom,
  resolveIMessageConfigDefaultTo,
} from "./channel-config-helpers";
export { IMessageConfigSchema } from "../config/zod-schema.providers-core";
export {
  parseChatAllowTargetPrefixes,
  parseChatTargetPrefixesOrThrow,
  resolveServicePrefixedAllowTarget,
  resolveServicePrefixedTarget,
} from "@/src-backend/extensions/imessage/api";
export type { ParsedChatTarget } from "@/src-backend/extensions/imessage/api";
