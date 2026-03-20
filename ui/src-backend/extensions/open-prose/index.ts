import { definePluginEntry, type PowerDirectorPluginApi } from "./runtime-api";

export default definePluginEntry({
  id: "open-prose",
  name: "OpenProse",
  description: "Plugin-shipped prose skills bundle",
  register(_api: PowerDirectorPluginApi) {
    // OpenProse is delivered via plugin-shipped skills.
  },
});
