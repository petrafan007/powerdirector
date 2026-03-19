import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/compat";
import type { PluginRuntime } from "powerdirector/plugin-sdk/matrix";

const { setRuntime: setMatrixRuntime, getRuntime: getMatrixRuntime } =
  createPluginRuntimeStore<PluginRuntime>("Matrix runtime not initialized");
export { getMatrixRuntime, setMatrixRuntime };
