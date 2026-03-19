import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/compat";
import type { PluginRuntime } from "powerdirector/plugin-sdk/zalo";

const { setRuntime: setZaloRuntime, getRuntime: getZaloRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Zalo runtime not initialized");
export { getZaloRuntime, setZaloRuntime };
