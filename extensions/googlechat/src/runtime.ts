import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/compat";
import type { PluginRuntime } from "powerdirector/plugin-sdk/googlechat";

const { setRuntime: setGoogleChatRuntime, getRuntime: getGoogleChatRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Google Chat runtime not initialized");
export { getGoogleChatRuntime, setGoogleChatRuntime };
