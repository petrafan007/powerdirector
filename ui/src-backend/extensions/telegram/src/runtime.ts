import type { PluginRuntime } from "@/src-backend/plugin-sdk/core";
import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";

const { setRuntime: setTelegramRuntime, getRuntime: getTelegramRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Telegram runtime not initialized");
export { getTelegramRuntime, setTelegramRuntime };
