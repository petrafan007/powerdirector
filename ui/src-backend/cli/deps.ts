import type { sendMessageWhatsApp } from '../channels/web/index';
import type { sendMessageDiscord } from '../discord/send';
import type { sendMessageIMessage } from '../imessage/send';
import type { OutboundSendDeps } from '../infra/outbound/deliver';
import type { sendMessageSignal } from '../signal/send';
import type { sendMessageSlack } from '../slack/send';
import type { sendMessageTelegram } from '../telegram/send';

export type CliDeps = {
  sendMessageWhatsApp: typeof sendMessageWhatsApp;
  sendMessageTelegram: typeof sendMessageTelegram;
  sendMessageDiscord: typeof sendMessageDiscord;
  sendMessageSlack: typeof sendMessageSlack;
  sendMessageSignal: typeof sendMessageSignal;
  sendMessageIMessage: typeof sendMessageIMessage;
};

export function createDefaultDeps(): CliDeps {
  return {
    sendMessageWhatsApp: async (...args) => {
      const { sendMessageWhatsApp } = await import('../channels/web/index');
      return await sendMessageWhatsApp(...args);
    },
    sendMessageTelegram: async (...args) => {
      const { sendMessageTelegram } = await import('../telegram/send');
      return await sendMessageTelegram(...args);
    },
    sendMessageDiscord: async (...args) => {
      const { sendMessageDiscord } = await import('../discord/send');
      return await sendMessageDiscord(...args);
    },
    sendMessageSlack: async (...args) => {
      const { sendMessageSlack } = await import('../slack/send');
      return await sendMessageSlack(...args);
    },
    sendMessageSignal: async (...args) => {
      const { sendMessageSignal } = await import('../signal/send');
      return await sendMessageSignal(...args);
    },
    sendMessageIMessage: async (...args) => {
      const { sendMessageIMessage } = await import('../imessage/send');
      return await sendMessageIMessage(...args);
    },
  };
}

// Provider docking: extend this mapping when adding new outbound send deps.
export function createOutboundSendDeps(deps: CliDeps): OutboundSendDeps {
  return {
    sendWhatsApp: deps.sendMessageWhatsApp,
    sendTelegram: deps.sendMessageTelegram,
    sendDiscord: deps.sendMessageDiscord,
    sendSlack: deps.sendMessageSlack,
    sendSignal: deps.sendMessageSignal,
    sendIMessage: deps.sendMessageIMessage,
  };
}

export { logWebSelfId } from '../web/auth-store';
