import { sendMessageTelegram as sendMessageTelegramImpl } from "@/src-backend/plugin-sdk/telegram";

type RuntimeSend = {
  sendMessage: typeof import("@/src-backend/plugin-sdk/telegram").sendMessageTelegram;
};

export const runtimeSend = {
  sendMessage: sendMessageTelegramImpl,
} satisfies RuntimeSend;
