import { loadVoiceWakeConfig, setVoiceWakeTriggers } from '../../infra/voicewake';
import { ErrorCodes, errorShape } from '../protocol/index';
import { normalizeVoiceWakeTriggers } from '../server-utils';
import { formatForLog } from '../ws-log';
import type { GatewayRequestHandlers } from './types';

export const voicewakeHandlers: GatewayRequestHandlers = {
  "voicewake.get": async ({ respond }) => {
    try {
      const cfg = await loadVoiceWakeConfig();
      respond(true, { triggers: cfg.triggers });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
  "voicewake.set": async ({ params, respond, context }) => {
    if (!Array.isArray(params.triggers)) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "voicewake.set requires triggers: string[]"),
      );
      return;
    }
    try {
      const triggers = normalizeVoiceWakeTriggers(params.triggers);
      const cfg = await setVoiceWakeTriggers(triggers);
      context.broadcastVoiceWakeChanged(cfg.triggers);
      respond(true, { triggers: cfg.triggers });
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
};
