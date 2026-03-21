import type { PluginRuntime } from "powerdirector/plugin-sdk/core";
import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/runtime-store";

const { setRuntime: setIMessageRuntime, getRuntime: getIMessageRuntime } =
  createPluginRuntimeStore<PluginRuntime>("iMessage runtime not initialized");
export { getIMessageRuntime, setIMessageRuntime };
