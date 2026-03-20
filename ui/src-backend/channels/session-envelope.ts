import { resolveEnvelopeFormatOptions } from "../auto-reply/envelope";
import type { PowerDirectorConfig } from "../config/config";
import { readSessionUpdatedAt, resolveStorePath } from "../config/sessions";

export function resolveInboundSessionEnvelopeContext(params: {
  cfg: PowerDirectorConfig;
  agentId: string;
  sessionKey: string;
}) {
  const storePath = resolveStorePath(params.cfg.session?.store, {
    agentId: params.agentId,
  });
  return {
    storePath,
    envelopeOptions: resolveEnvelopeFormatOptions(params.cfg),
    previousTimestamp: readSessionUpdatedAt({
      storePath,
      sessionKey: params.sessionKey,
    }),
  };
}
