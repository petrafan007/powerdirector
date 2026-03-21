import { auditDiscordChannelPermissions as auditDiscordChannelPermissionsImpl } from "powerdirector/plugin-sdk/discord";
import {
  listDiscordDirectoryGroupsLive as listDiscordDirectoryGroupsLiveImpl,
  listDiscordDirectoryPeersLive as listDiscordDirectoryPeersLiveImpl,
} from "powerdirector/plugin-sdk/discord";
import { monitorDiscordProvider as monitorDiscordProviderImpl } from "powerdirector/plugin-sdk/discord";
import { probeDiscord as probeDiscordImpl } from "powerdirector/plugin-sdk/discord";
import { resolveDiscordChannelAllowlist as resolveDiscordChannelAllowlistImpl } from "powerdirector/plugin-sdk/discord";
import { resolveDiscordUserAllowlist as resolveDiscordUserAllowlistImpl } from "powerdirector/plugin-sdk/discord";
import {
  createThreadDiscord as createThreadDiscordImpl,
  deleteMessageDiscord as deleteMessageDiscordImpl,
  editChannelDiscord as editChannelDiscordImpl,
  editMessageDiscord as editMessageDiscordImpl,
  pinMessageDiscord as pinMessageDiscordImpl,
  sendDiscordComponentMessage as sendDiscordComponentMessageImpl,
  sendMessageDiscord as sendMessageDiscordImpl,
  sendPollDiscord as sendPollDiscordImpl,
  sendTypingDiscord as sendTypingDiscordImpl,
  unpinMessageDiscord as unpinMessageDiscordImpl,
} from "powerdirector/plugin-sdk/discord";
import type { PluginRuntimeChannel } from "./types-channel";

type RuntimeDiscordOps = Pick<
  PluginRuntimeChannel["discord"],
  | "auditChannelPermissions"
  | "listDirectoryGroupsLive"
  | "listDirectoryPeersLive"
  | "probeDiscord"
  | "resolveChannelAllowlist"
  | "resolveUserAllowlist"
  | "sendComponentMessage"
  | "sendMessageDiscord"
  | "sendPollDiscord"
  | "monitorDiscordProvider"
> & {
  typing: Pick<PluginRuntimeChannel["discord"]["typing"], "pulse">;
  conversationActions: Pick<
    PluginRuntimeChannel["discord"]["conversationActions"],
    "editMessage" | "deleteMessage" | "pinMessage" | "unpinMessage" | "createThread" | "editChannel"
  >;
};

export const runtimeDiscordOps = {
  auditChannelPermissions: auditDiscordChannelPermissionsImpl,
  listDirectoryGroupsLive: listDiscordDirectoryGroupsLiveImpl,
  listDirectoryPeersLive: listDiscordDirectoryPeersLiveImpl,
  probeDiscord: probeDiscordImpl,
  resolveChannelAllowlist: resolveDiscordChannelAllowlistImpl,
  resolveUserAllowlist: resolveDiscordUserAllowlistImpl,
  sendComponentMessage: sendDiscordComponentMessageImpl,
  sendMessageDiscord: sendMessageDiscordImpl,
  sendPollDiscord: sendPollDiscordImpl,
  monitorDiscordProvider: monitorDiscordProviderImpl,
  typing: {
    pulse: sendTypingDiscordImpl,
  },
  conversationActions: {
    editMessage: editMessageDiscordImpl,
    deleteMessage: deleteMessageDiscordImpl,
    pinMessage: pinMessageDiscordImpl,
    unpinMessage: unpinMessageDiscordImpl,
    createThread: createThreadDiscordImpl,
    editChannel: editChannelDiscordImpl,
  },
} satisfies RuntimeDiscordOps;
