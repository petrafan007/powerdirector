import type { MsgContext } from "../auto-reply/templating";
import type { PowerDirectorConfig } from "../config/config";
import { recordSessionMetaFromInbound, resolveStorePath } from "../config/sessions";

export async function recordInboundSessionMetaSafe(params: {
  cfg: PowerDirectorConfig;
  agentId: string;
  sessionKey: string;
  ctx: MsgContext;
  onError?: (error: unknown) => void;
}): Promise<void> {
  const storePath = resolveStorePath(params.cfg.session?.store, {
    agentId: params.agentId,
  });
  try {
    await recordSessionMetaFromInbound({
      storePath,
      sessionKey: params.sessionKey,
      ctx: params.ctx,
    });
  } catch (err) {
    params.onError?.(err);
  }
}
