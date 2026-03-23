import { createPluginRuntimeStore } from "powerdirector/plugin-sdk/runtime-store";
import type { PluginRuntime } from "../runtime-api";

const {
  setRuntime: setMatrixRuntime,
  clearRuntime: clearMatrixRuntime,
  tryGetRuntime: tryGetMatrixRuntime,
  getRuntime: getMatrixRuntime,
} = createPluginRuntimeStore<PluginRuntime>("Matrix runtime not initialized");
export { clearMatrixRuntime, getMatrixRuntime, setMatrixRuntime, tryGetMatrixRuntime };
