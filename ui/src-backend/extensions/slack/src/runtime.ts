import type { PluginRuntime } from "@/src-backend/plugin-sdk/core";
import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";

const { setRuntime: setSlackRuntime, getRuntime: getSlackRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Slack runtime not initialized");
export { getSlackRuntime, setSlackRuntime };
