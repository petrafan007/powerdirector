import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";
import type { PluginRuntime } from "./runtime-api";

const { setRuntime: setZaloRuntime, getRuntime: getZaloRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Zalo runtime not initialized");
export { getZaloRuntime, setZaloRuntime };
