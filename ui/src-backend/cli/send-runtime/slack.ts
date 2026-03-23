import { sendMessageSlack as sendMessageSlackImpl } from "powerdirector/plugin-sdk/slack";

type RuntimeSend = {
  sendMessage: typeof import("powerdirector/plugin-sdk/slack").sendMessageSlack;
};

export const runtimeSend = {
  sendMessage: sendMessageSlackImpl,
} satisfies RuntimeSend;
