import { defineChannelPluginEntry } from "@/src-backend/plugin-sdk/core";
import { nextcloudTalkPlugin } from "./src/channel";
import { setNextcloudTalkRuntime } from "./src/runtime";

export { nextcloudTalkPlugin } from "./src/channel";
export { setNextcloudTalkRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "nextcloud-talk",
  name: "Nextcloud Talk",
  description: "Nextcloud Talk channel plugin",
  plugin: nextcloudTalkPlugin,
  setRuntime: setNextcloudTalkRuntime,
});
