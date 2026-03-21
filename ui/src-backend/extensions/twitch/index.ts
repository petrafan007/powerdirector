import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { twitchPlugin } from "./src/plugin";
import { setTwitchRuntime } from "./src/runtime";

export { monitorTwitchProvider } from "./src/monitor";

export default defineChannelPluginEntry({
  id: "twitch",
  name: "Twitch",
  description: "Twitch chat channel plugin",
  plugin: twitchPlugin,
  setRuntime: setTwitchRuntime,
});
