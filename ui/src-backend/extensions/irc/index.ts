import type { ChannelPlugin } from "powerdirector/plugin-sdk/core";
import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { ircPlugin } from "./src/channel";
import { setIrcRuntime } from "./src/runtime";

export { ircPlugin } from "./src/channel";
export { setIrcRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "irc",
  name: "IRC",
  description: "IRC channel plugin",
  plugin: ircPlugin as ChannelPlugin,
  setRuntime: setIrcRuntime,
});
