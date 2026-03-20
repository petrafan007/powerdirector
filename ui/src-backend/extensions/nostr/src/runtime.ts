import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";
import type { PluginRuntime } from "../api";

const { setRuntime: setNostrRuntime, getRuntime: getNostrRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Nostr runtime not initialized");
export { getNostrRuntime, setNostrRuntime };
