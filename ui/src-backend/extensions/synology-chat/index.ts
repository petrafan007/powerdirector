import { defineChannelPluginEntry } from "@/src-backend/plugin-sdk/core";
import { synologyChatPlugin } from "./src/channel";
import { setSynologyRuntime } from "./src/runtime";

export { synologyChatPlugin } from "./src/channel";
export { setSynologyRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "synology-chat",
  name: "Synology Chat",
  description: "Native Synology Chat channel plugin for PowerDirector",
  plugin: synologyChatPlugin,
  setRuntime: setSynologyRuntime,
});
