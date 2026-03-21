import type { PowerDirectorConfig } from "powerdirector/plugin-sdk/config-runtime";
import { getExecApprovalReplyMetadata } from "powerdirector/plugin-sdk/infra-runtime";
import type { ReplyPayload } from "powerdirector/plugin-sdk/reply-runtime";
import { resolveDiscordAccount } from "./accounts";

export function isDiscordExecApprovalClientEnabled(params: {
  cfg: PowerDirectorConfig;
  accountId?: string | null;
}): boolean {
  const config = resolveDiscordAccount(params).config.execApprovals;
  return Boolean(config?.enabled && (config.approvers?.length ?? 0) > 0);
}

export function shouldSuppressLocalDiscordExecApprovalPrompt(params: {
  cfg: PowerDirectorConfig;
  accountId?: string | null;
  payload: ReplyPayload;
}): boolean {
  return (
    isDiscordExecApprovalClientEnabled(params) &&
    getExecApprovalReplyMetadata(params.payload) !== null
  );
}
