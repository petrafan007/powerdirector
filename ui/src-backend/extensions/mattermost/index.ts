import { defineChannelPluginEntry } from "@/src-backend/plugin-sdk/core";
import { mattermostPlugin } from "./src/channel";
import { registerSlashCommandRoute } from "./src/mattermost/slash-state";
import { setMattermostRuntime } from "./src/runtime";

export { mattermostPlugin } from "./src/channel";
export { setMattermostRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "mattermost",
  name: "Mattermost",
  description: "Mattermost channel plugin",
  plugin: mattermostPlugin,
  setRuntime: setMattermostRuntime,
  registerFull(api) {
    // Actual slash-command registration happens after the monitor connects and
    // knows the team id; the route itself can be wired here.
    registerSlashCommandRoute(api);
  },
});
