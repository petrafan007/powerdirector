import { definePluginEntry } from "@/src-backend/plugin-sdk/core";
import { buildElevenLabsSpeechProvider } from "@/src-backend/plugin-sdk/speech";

export default definePluginEntry({
  id: "elevenlabs",
  name: "ElevenLabs Speech",
  description: "Bundled ElevenLabs speech provider",
  register(api) {
    api.registerSpeechProvider(buildElevenLabsSpeechProvider());
  },
});
