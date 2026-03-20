import type { PluginRuntime } from "@/src-backend/plugin-sdk/core";
import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";

const { setRuntime: setSignalRuntime, getRuntime: getSignalRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Signal runtime not initialized");
export { getSignalRuntime, setSignalRuntime };
