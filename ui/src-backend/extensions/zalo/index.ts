import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { zaloPlugin } from "./src/channel";
import { setZaloRuntime } from "./src/runtime";

export { zaloPlugin } from "./src/channel";
export { setZaloRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "zalo",
  name: "Zalo",
  description: "Zalo channel plugin",
  plugin: zaloPlugin,
  setRuntime: setZaloRuntime,
});
