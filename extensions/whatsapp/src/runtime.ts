import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/compat";
import type { PluginRuntime } from "powerdirector/plugin-sdk/whatsapp";

const { setRuntime: setWhatsAppRuntime, getRuntime: getWhatsAppRuntime } =
  createPluginRuntimeStore<PluginRuntime>("WhatsApp runtime not initialized");
export { getWhatsAppRuntime, setWhatsAppRuntime };
