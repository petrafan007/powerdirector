import { defineChannelPluginEntry } from "@/src-backend/plugin-sdk/core";
import { signalPlugin } from "./src/channel";
import { setSignalRuntime } from "./src/runtime";

export { signalPlugin } from "./src/channel";
export { setSignalRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "signal",
  name: "Signal",
  description: "Signal channel plugin",
  plugin: signalPlugin,
  setRuntime: setSignalRuntime,
});
