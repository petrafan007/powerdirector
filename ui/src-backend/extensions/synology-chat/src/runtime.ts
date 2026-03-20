import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";
import type { PluginRuntime } from "../api";

const { setRuntime: setSynologyRuntime, getRuntime: getSynologyRuntime } =
  createPluginRuntimeStore<PluginRuntime>(
    "Synology Chat runtime not initialized - plugin not registered",
  );
export { getSynologyRuntime, setSynologyRuntime };
