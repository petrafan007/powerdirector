import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { discordPlugin } from "./src/channel";
import { setDiscordRuntime } from "./src/runtime";
import { registerDiscordSubagentHooks } from "./src/subagent-hooks";

export { discordPlugin } from "./src/channel";
export { setDiscordRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "discord",
  name: "Discord",
  description: "Discord channel plugin",
  plugin: discordPlugin,
  setRuntime: setDiscordRuntime,
  registerFull: registerDiscordSubagentHooks,
});
