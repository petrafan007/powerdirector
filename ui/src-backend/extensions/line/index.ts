import { defineChannelPluginEntry } from "@/src-backend/plugin-sdk/core";
import { registerLineCardCommand } from "./src/card-command";
import { linePlugin } from "./src/channel";
import { setLineRuntime } from "./src/runtime";

export { linePlugin } from "./src/channel";
export { setLineRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "line",
  name: "LINE",
  description: "LINE Messaging API channel plugin",
  plugin: linePlugin,
  setRuntime: setLineRuntime,
  registerFull: registerLineCardCommand,
});
