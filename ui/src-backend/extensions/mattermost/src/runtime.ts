import { createPluginRuntimeStore } from "@/src-backend/plugin-sdk/runtime-store";
import type { PluginRuntime } from "./runtime-api";

const { setRuntime: setMattermostRuntime, getRuntime: getMattermostRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Mattermost runtime not initialized");
export { getMattermostRuntime, setMattermostRuntime };
