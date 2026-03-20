import { resolveChannelGroupRequireMention } from "@/src-backend/plugin-sdk/channel-policy";
import { resolveExactLineGroupConfigKey, type PowerDirectorConfig } from "../runtime-api";

type LineGroupContext = {
  cfg: PowerDirectorConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveLineGroupRequireMention(params: LineGroupContext): boolean {
  const exactGroupId = resolveExactLineGroupConfigKey({
    cfg: params.cfg,
    accountId: params.accountId,
    groupId: params.groupId,
  });
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "line",
    groupId: exactGroupId ?? params.groupId,
    accountId: params.accountId,
  });
}
