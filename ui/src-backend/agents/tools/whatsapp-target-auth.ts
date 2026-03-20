import type { PowerDirectorConfig } from "../../config/config";
import { resolveWhatsAppAccount } from "../../web/accounts";
import { resolveWhatsAppOutboundTarget } from "../../whatsapp/resolve-outbound-target";
import { ToolAuthorizationError } from "./common";

export function resolveAuthorizedWhatsAppOutboundTarget(params: {
  cfg: PowerDirectorConfig;
  chatJid: string;
  accountId?: string;
  actionLabel: string;
}): { to: string; accountId: string } {
  const account = resolveWhatsAppAccount({
    cfg: params.cfg,
    accountId: params.accountId,
  });
  const resolution = resolveWhatsAppOutboundTarget({
    to: params.chatJid,
    allowFrom: account.allowFrom ?? [],
    mode: "implicit",
  });
  if (!resolution.ok) {
    throw new ToolAuthorizationError(
      `WhatsApp ${params.actionLabel} blocked: chatJid "${params.chatJid}" is not in the configured allowFrom list for account "${account.accountId}".`,
    );
  }
  return { to: resolution.to, accountId: account.accountId };
}
