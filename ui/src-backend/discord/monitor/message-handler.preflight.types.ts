import type { ChannelType, Client, User } from "@buape/carbon";
import type { HistoryEntry } from '../../auto-reply/reply/history';
import type { ReplyToMode } from '../../config/config';
import type { resolveAgentRoute } from '../../routing/resolve-route';
import type { DiscordChannelConfigResolved, DiscordGuildEntryResolved } from './allow-list';
import type { DiscordChannelInfo } from './message-utils';
import type { DiscordSenderIdentity } from './sender-identity';

export type { DiscordSenderIdentity } from './sender-identity';
import type { DiscordThreadChannel } from './threading';

export type LoadedConfig = ReturnType<typeof import('../../config/config').loadConfig>;
export type RuntimeEnv = import('../../runtime').RuntimeEnv;

export type DiscordMessageEvent = import('./listeners').DiscordMessageEvent;

export type DiscordMessagePreflightContext = {
  cfg: LoadedConfig;
  discordConfig: NonNullable<
    import('../../config/config').PowerDirectorConfig["channels"]
  >["discord"];
  accountId: string;
  token: string;
  runtime: RuntimeEnv;
  botUserId?: string;
  guildHistories: Map<string, HistoryEntry[]>;
  historyLimit: number;
  mediaMaxBytes: number;
  textLimit: number;
  replyToMode: ReplyToMode;
  ackReactionScope: "all" | "direct" | "group-all" | "group-mentions";
  groupPolicy: "open" | "disabled" | "allowlist";

  data: DiscordMessageEvent;
  client: Client;
  message: DiscordMessageEvent["message"];
  messageChannelId: string;
  author: User;
  sender: DiscordSenderIdentity;

  channelInfo: DiscordChannelInfo | null;
  channelName?: string;

  isGuildMessage: boolean;
  isDirectMessage: boolean;
  isGroupDm: boolean;

  commandAuthorized: boolean;
  baseText: string;
  messageText: string;
  wasMentioned: boolean;

  route: ReturnType<typeof resolveAgentRoute>;

  guildInfo: DiscordGuildEntryResolved | null;
  guildSlug: string;

  threadChannel: DiscordThreadChannel | null;
  threadParentId?: string;
  threadParentName?: string;
  threadParentType?: ChannelType;
  threadName?: string | null;

  configChannelName?: string;
  configChannelSlug: string;
  displayChannelName?: string;
  displayChannelSlug: string;

  baseSessionKey: string;
  channelConfig: DiscordChannelConfigResolved | null;
  channelAllowlistConfigured: boolean;
  channelAllowed: boolean;

  shouldRequireMention: boolean;
  hasAnyMention: boolean;
  allowTextCommands: boolean;
  shouldBypassMention: boolean;
  effectiveWasMentioned: boolean;
  canDetectMention: boolean;

  historyEntry?: HistoryEntry;
};

export type DiscordMessagePreflightParams = {
  cfg: LoadedConfig;
  discordConfig: DiscordMessagePreflightContext["discordConfig"];
  accountId: string;
  token: string;
  runtime: RuntimeEnv;
  botUserId?: string;
  guildHistories: Map<string, HistoryEntry[]>;
  historyLimit: number;
  mediaMaxBytes: number;
  textLimit: number;
  replyToMode: ReplyToMode;
  dmEnabled: boolean;
  groupDmEnabled: boolean;
  groupDmChannels?: string[];
  allowFrom?: string[];
  guildEntries?: Record<string, DiscordGuildEntryResolved>;
  ackReactionScope: DiscordMessagePreflightContext["ackReactionScope"];
  groupPolicy: DiscordMessagePreflightContext["groupPolicy"];
  data: DiscordMessageEvent;
  client: Client;
};
