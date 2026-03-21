import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import { msteamsPlugin } from "./src/channel";
import { setMSTeamsRuntime } from "./src/runtime";

export { msteamsPlugin } from "./src/channel";
export { setMSTeamsRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "msteams",
  name: "Microsoft Teams",
  description: "Microsoft Teams channel plugin (Bot Framework)",
  plugin: msteamsPlugin,
  setRuntime: setMSTeamsRuntime,
});
