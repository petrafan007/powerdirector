import {
  monitorSignalProvider,
  probeSignal,
  signalMessageActions,
  sendMessageSignal,
} from "../../plugin-sdk/signal";
import type { PluginRuntimeChannel } from "./types-channel";

export function createRuntimeSignal(): PluginRuntimeChannel["signal"] {
  return {
    probeSignal,
    sendMessageSignal,
    monitorSignalProvider,
    messageActions: signalMessageActions,
  };
}
