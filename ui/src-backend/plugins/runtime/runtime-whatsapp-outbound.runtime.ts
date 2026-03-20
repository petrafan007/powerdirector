import {
  sendMessageWhatsApp as sendMessageWhatsAppImpl,
  sendPollWhatsApp as sendPollWhatsAppImpl,
} from "./runtime-whatsapp-boundary";
import type { PluginRuntime } from "./types";

type RuntimeWhatsAppOutbound = Pick<
  PluginRuntime["channel"]["whatsapp"],
  "sendMessageWhatsApp" | "sendPollWhatsApp"
>;

export const runtimeWhatsAppOutbound = {
  sendMessageWhatsApp: sendMessageWhatsAppImpl,
  sendPollWhatsApp: sendPollWhatsAppImpl,
} satisfies RuntimeWhatsAppOutbound;
