import type { PluginRuntime } from "powerdirector/plugin-sdk/core";
import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/runtime-store";

const { setRuntime: setWhatsAppRuntime, getRuntime: getWhatsAppRuntime } =
  createPluginRuntimeStore<PluginRuntime>("WhatsApp runtime not initialized");
export { getWhatsAppRuntime, setWhatsAppRuntime };
