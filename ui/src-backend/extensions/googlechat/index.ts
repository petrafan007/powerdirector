import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { googlechatPlugin } from "./src/channel";
import { setGoogleChatRuntime } from "./src/runtime";

export { googlechatPlugin } from "./src/channel";
export { setGoogleChatRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "googlechat",
  name: "Google Chat",
  description: "PowerDirector Google Chat channel plugin",
  plugin: googlechatPlugin,
  setRuntime: setGoogleChatRuntime,
});
