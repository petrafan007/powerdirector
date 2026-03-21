import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { imessagePlugin } from "./src/channel";
import { setIMessageRuntime } from "./src/runtime";

export { imessagePlugin } from "./src/channel";
export { setIMessageRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "imessage",
  name: "iMessage",
  description: "iMessage channel plugin",
  plugin: imessagePlugin,
  setRuntime: setIMessageRuntime,
});
