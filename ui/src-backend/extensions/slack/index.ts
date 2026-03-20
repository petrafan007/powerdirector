import { defineChannelPluginEntry } from "@/src-backend/plugin-sdk/core";
import { slackPlugin } from "./src/channel";
import { setSlackRuntime } from "./src/runtime";

export { slackPlugin } from "./src/channel";
export { setSlackRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "slack",
  name: "Slack",
  description: "Slack channel plugin",
  plugin: slackPlugin,
  setRuntime: setSlackRuntime,
});
