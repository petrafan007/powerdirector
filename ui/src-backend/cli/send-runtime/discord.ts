import { sendMessageDiscord as sendMessageDiscordImpl } from "@/src-backend/plugin-sdk/discord";

type RuntimeSend = {
  sendMessage: typeof import("@/src-backend/plugin-sdk/discord").sendMessageDiscord;
};

export const runtimeSend = {
  sendMessage: sendMessageDiscordImpl,
} satisfies RuntimeSend;
