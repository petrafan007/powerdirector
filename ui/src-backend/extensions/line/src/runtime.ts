import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/runtime-store";
import type { PluginRuntime } from "../api";

const { setRuntime: setLineRuntime, getRuntime: getLineRuntime } =
  createPluginRuntimeStore<PluginRuntime>("LINE runtime not initialized - plugin not registered");
export { getLineRuntime, setLineRuntime };
