import { sendMessageSignal as sendMessageSignalImpl } from "../../plugin-sdk/signal";

type RuntimeSend = {
  sendMessage: typeof import("../../plugin-sdk/signal").sendMessageSignal;
};

export const runtimeSend = {
  sendMessage: sendMessageSignalImpl,
} satisfies RuntimeSend;
