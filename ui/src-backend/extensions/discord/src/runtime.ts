import type { PluginRuntime } from "@/src-backend/plugin-sdk/core";
import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";

const { setRuntime: setDiscordRuntime, getRuntime: getDiscordRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Discord runtime not initialized");
export { getDiscordRuntime, setDiscordRuntime };
