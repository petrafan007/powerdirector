import {
  listSlackDirectoryGroupsLive as listSlackDirectoryGroupsLiveImpl,
  listSlackDirectoryPeersLive as listSlackDirectoryPeersLiveImpl,
} from "@/src-backend/plugin-sdk/slack";
import { monitorSlackProvider as monitorSlackProviderImpl } from "@/src-backend/plugin-sdk/slack";
import { probeSlack as probeSlackImpl } from "@/src-backend/plugin-sdk/slack";
import { resolveSlackChannelAllowlist as resolveSlackChannelAllowlistImpl } from "@/src-backend/plugin-sdk/slack";
import { resolveSlackUserAllowlist as resolveSlackUserAllowlistImpl } from "@/src-backend/plugin-sdk/slack";
import { sendMessageSlack as sendMessageSlackImpl } from "@/src-backend/plugin-sdk/slack";
import { handleSlackAction as handleSlackActionImpl } from "@/src-backend/plugin-sdk/slack";
import type { PluginRuntimeChannel } from "./types-channel";

type RuntimeSlackOps = Pick<
  PluginRuntimeChannel["slack"],
  | "listDirectoryGroupsLive"
  | "listDirectoryPeersLive"
  | "probeSlack"
  | "resolveChannelAllowlist"
  | "resolveUserAllowlist"
  | "sendMessageSlack"
  | "monitorSlackProvider"
  | "handleSlackAction"
>;

export const runtimeSlackOps = {
  listDirectoryGroupsLive: listSlackDirectoryGroupsLiveImpl,
  listDirectoryPeersLive: listSlackDirectoryPeersLiveImpl,
  probeSlack: probeSlackImpl,
  resolveChannelAllowlist: resolveSlackChannelAllowlistImpl,
  resolveUserAllowlist: resolveSlackUserAllowlistImpl,
  sendMessageSlack: sendMessageSlackImpl,
  monitorSlackProvider: monitorSlackProviderImpl,
  handleSlackAction: handleSlackActionImpl,
} satisfies RuntimeSlackOps;
