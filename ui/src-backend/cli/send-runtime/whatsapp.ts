import { sendMessageWhatsApp as sendMessageWhatsAppImpl } from "../../plugins/runtime/runtime-whatsapp-boundary";

type RuntimeSend = {
  sendMessage: typeof import("../../plugins/runtime/runtime-whatsapp-boundary").sendMessageWhatsApp;
};

export const runtimeSend = {
  sendMessage: sendMessageWhatsAppImpl,
} satisfies RuntimeSend;
