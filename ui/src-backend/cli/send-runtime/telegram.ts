import { sendMessageTelegram as sendMessageTelegramImpl } from "powerdirector/plugin-sdk/telegram";

type RuntimeSend = {
  sendMessage: typeof import("powerdirector/plugin-sdk/telegram").sendMessageTelegram;
};

export const runtimeSend = {
  sendMessage: sendMessageTelegramImpl,
} satisfies RuntimeSend;
