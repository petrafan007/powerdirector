import type { PluginRuntime } from "powerdirector/plugin-sdk/plugin-runtime";
import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/runtime-store";

const { setRuntime: setTlonRuntime, getRuntime: getTlonRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Tlon runtime not initialized");
export { getTlonRuntime, setTlonRuntime };
