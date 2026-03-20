import { sendMessageSlack as sendMessageSlackImpl } from "@/src-backend/plugin-sdk/slack";

type RuntimeSend = {
  sendMessage: typeof import("@/src-backend/plugin-sdk/slack").sendMessageSlack;
};

export const runtimeSend = {
  sendMessage: sendMessageSlackImpl,
} satisfies RuntimeSend;
