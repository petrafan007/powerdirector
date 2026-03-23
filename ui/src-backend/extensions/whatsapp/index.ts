import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { whatsappPlugin } from "./src/channel";
import { setWhatsAppRuntime } from "./src/runtime";

export { whatsappPlugin } from "./src/channel";
export { setWhatsAppRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "whatsapp",
  name: "WhatsApp",
  description: "WhatsApp channel plugin",
  plugin: whatsappPlugin,
  setRuntime: setWhatsAppRuntime,
});
