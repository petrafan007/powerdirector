import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { matrixPlugin } from "./src/channel";
import { setMatrixRuntime } from "./src/runtime";

export { matrixPlugin } from "./src/channel";
export { setMatrixRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "matrix",
  name: "Matrix",
  description: "Matrix channel plugin",
  plugin: matrixPlugin,
  setRuntime: setMatrixRuntime,
});
