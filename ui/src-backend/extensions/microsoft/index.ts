import { definePluginEntry } from "@/src-backend/plugin-sdk/core";
import { buildMicrosoftSpeechProvider } from "@/src-backend/plugin-sdk/speech";

export default definePluginEntry({
  id: "microsoft",
  name: "Microsoft Speech",
  description: "Bundled Microsoft speech provider",
  register(api) {
    api.registerSpeechProvider(buildMicrosoftSpeechProvider());
  },
});
