import { sendMessageIMessage as sendMessageIMessageImpl } from "../../plugin-sdk/imessage";

type RuntimeSend = {
  sendMessage: typeof import("../../plugin-sdk/imessage").sendMessageIMessage;
};

export const runtimeSend = {
  sendMessage: sendMessageIMessageImpl,
} satisfies RuntimeSend;
