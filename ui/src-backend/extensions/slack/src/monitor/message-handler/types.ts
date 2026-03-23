import type { FinalizedMsgContext } from "powerdirector/plugin-sdk/reply-runtime";
import type { ResolvedAgentRoute } from "powerdirector/plugin-sdk/routing";
import type { ResolvedSlackAccount } from "../../accounts";
import type { SlackMessageEvent } from "../../types";
import type { SlackChannelConfigResolved } from "../channel-config";
import type { SlackMonitorContext } from "../context";

export type PreparedSlackMessage = {
  ctx: SlackMonitorContext;
  account: ResolvedSlackAccount;
  message: SlackMessageEvent;
  route: ResolvedAgentRoute;
  channelConfig: SlackChannelConfigResolved | null;
  replyTarget: string;
  ctxPayload: FinalizedMsgContext;
  replyToMode: "off" | "first" | "all";
  isDirectMessage: boolean;
  isRoomish: boolean;
  historyKey: string;
  preview: string;
  ackReactionMessageTs?: string;
  ackReactionValue: string;
  ackReactionPromise: Promise<boolean> | null;
};
