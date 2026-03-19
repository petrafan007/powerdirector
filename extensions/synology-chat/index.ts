import type { PowerDirectorPluginApi } from "powerdirector/plugin-sdk/synology-chat";
import { emptyPluginConfigSchema } from "powerdirector/plugin-sdk/synology-chat";
import { createSynologyChatPlugin } from "./src/channel.js";
import { setSynologyRuntime } from "./src/runtime.js";

const plugin = {
  id: "synology-chat",
  name: "Synology Chat",
  description: "Native Synology Chat channel plugin for PowerDirector",
  configSchema: emptyPluginConfigSchema(),
  register(api: PowerDirectorPluginApi) {
    setSynologyRuntime(api.runtime);
    api.registerChannel({ plugin: createSynologyChatPlugin() });
  },
};

export default plugin;
