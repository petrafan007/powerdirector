import { resolveChannelGroupRequireMention } from "powerdirector/plugin-sdk/channel-policy";
import type { PowerDirectorConfig } from "powerdirector/plugin-sdk/core";

type GoogleChatGroupContext = {
  cfg: PowerDirectorConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveGoogleChatGroupRequireMention(params: GoogleChatGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "googlechat",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}
