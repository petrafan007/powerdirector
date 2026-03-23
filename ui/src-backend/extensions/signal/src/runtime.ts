import type { PluginRuntime } from "powerdirector/plugin-sdk/core";
import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/runtime-store";

const { setRuntime: setSignalRuntime, getRuntime: getSignalRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Signal runtime not initialized");
export { getSignalRuntime, setSignalRuntime };
