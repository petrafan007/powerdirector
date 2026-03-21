import { sendMessageDiscord as sendMessageDiscordImpl } from "powerdirector/plugin-sdk/discord";

type RuntimeSend = {
  sendMessage: typeof import("powerdirector/plugin-sdk/discord").sendMessageDiscord;
};

export const runtimeSend = {
  sendMessage: sendMessageDiscordImpl,
} satisfies RuntimeSend;
