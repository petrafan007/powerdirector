import { buildOpenAIImageGenerationProvider } from "powerdirector/plugin-sdk/image-generation";
import { definePluginEntry } from "powerdirector/plugin-sdk/plugin-entry";
import { buildOpenAISpeechProvider } from "powerdirector/plugin-sdk/speech";
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
