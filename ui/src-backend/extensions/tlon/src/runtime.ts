import type { PluginRuntime } from "@/src-backend/plugin-sdk/plugin-runtime";
import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";

const { setRuntime: setTlonRuntime, getRuntime: getTlonRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Tlon runtime not initialized");
export { getTlonRuntime, setTlonRuntime };
