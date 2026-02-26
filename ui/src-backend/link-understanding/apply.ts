import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.ts";
import type { MsgContext } from "../auto-reply/templating.ts";
import type { PowerDirectorConfig } from "../config/config.ts";
import { formatLinkUnderstandingBody } from './format';
import { runLinkUnderstanding } from './runner';

export type ApplyLinkUnderstandingResult = {
  outputs: string[];
  urls: string[];
};

export async function applyLinkUnderstanding(params: {
  ctx: MsgContext;
  cfg: PowerDirectorConfig;
}): Promise<ApplyLinkUnderstandingResult> {
  const result = await runLinkUnderstanding({
    cfg: params.cfg,
    ctx: params.ctx,
  });

  if (result.outputs.length === 0) {
    return result;
  }

  params.ctx.LinkUnderstanding = [...(params.ctx.LinkUnderstanding ?? []), ...result.outputs];
  params.ctx.Body = formatLinkUnderstandingBody({
    body: params.ctx.Body,
    outputs: result.outputs,
  });

  finalizeInboundContext(params.ctx, {
    forceBodyForAgent: true,
    forceBodyForCommands: true,
  });

  return result;
}
