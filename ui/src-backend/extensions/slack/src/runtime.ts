import type { PluginRuntime } from "powerdirector/plugin-sdk/core";
import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/runtime-store";

const { setRuntime: setSlackRuntime, getRuntime: getSlackRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Slack runtime not initialized");
export { getSlackRuntime, setSlackRuntime };
