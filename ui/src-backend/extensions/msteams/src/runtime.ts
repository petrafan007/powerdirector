import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";
import type { PluginRuntime } from "../runtime-api";

const { setRuntime: setMSTeamsRuntime, getRuntime: getMSTeamsRuntime } =
  createPluginRuntimeStore<PluginRuntime>("MSTeams runtime not initialized");
export { getMSTeamsRuntime, setMSTeamsRuntime };
