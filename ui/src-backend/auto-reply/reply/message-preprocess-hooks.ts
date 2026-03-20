import type { PowerDirectorConfig } from "../../config/config";
import { fireAndForgetHook } from "../../hooks/fire-and-forget";
import { createInternalHookEvent, triggerInternalHook } from "../../hooks/internal-hooks";
import {
  deriveInboundMessageHookContext,
  toInternalMessagePreprocessedContext,
  toInternalMessageTranscribedContext,
} from "../../hooks/message-hook-mappers";
import type { FinalizedMsgContext } from "../templating";

export function emitPreAgentMessageHooks(params: {
  ctx: FinalizedMsgContext;
  cfg: PowerDirectorConfig;
  isFastTestEnv: boolean;
}): void {
  if (params.isFastTestEnv) {
    return;
  }
  const sessionKey = params.ctx.SessionKey?.trim();
  if (!sessionKey) {
    return;
  }

  const canonical = deriveInboundMessageHookContext(params.ctx);
  if (canonical.transcript) {
    fireAndForgetHook(
      triggerInternalHook(
        createInternalHookEvent(
          "message",
          "transcribed",
          sessionKey,
          toInternalMessageTranscribedContext(canonical, params.cfg),
        ),
      ),
      "get-reply: message:transcribed internal hook failed",
    );
  }

  fireAndForgetHook(
    triggerInternalHook(
      createInternalHookEvent(
        "message",
        "preprocessed",
        sessionKey,
        toInternalMessagePreprocessedContext(canonical, params.cfg),
      ),
    ),
    "get-reply: message:preprocessed internal hook failed",
  );
}
