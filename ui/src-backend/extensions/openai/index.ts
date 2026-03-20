import { buildOpenAIImageGenerationProvider } from "@/src-backend/plugin-sdk/image-generation";
import { definePluginEntry } from "@/src-backend/plugin-sdk/plugin-entry";
import { buildOpenAISpeechProvider } from "@/src-backend/plugin-sdk/speech";
import { openaiMediaUnderstandingProvider } from "./media-understanding-provider";
import { buildOpenAICodexProviderPlugin } from "./openai-codex-provider";
import { buildOpenAIProvider } from "./openai-provider";

export default definePluginEntry({
  id: "openai",
  name: "OpenAI Provider",
  description: "Bundled OpenAI provider plugins",
  register(api) {
    api.registerProvider(buildOpenAIProvider());
    api.registerProvider(buildOpenAICodexProviderPlugin());
    api.registerSpeechProvider(buildOpenAISpeechProvider());
    api.registerMediaUnderstandingProvider(openaiMediaUnderstandingProvider);
    api.registerImageGenerationProvider(buildOpenAIImageGenerationProvider());
  },
});
