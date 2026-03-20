import {
  monitorIMessageProvider,
  probeIMessage,
  sendMessageIMessage,
} from "@/src-backend/plugin-sdk/imessage";
import type { PluginRuntimeChannel } from "./types-channel";

export function createRuntimeIMessage(): PluginRuntimeChannel["imessage"] {
  return {
    monitorIMessageProvider,
    probeIMessage,
    sendMessageIMessage,
  };
}
