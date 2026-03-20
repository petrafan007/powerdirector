import type { MediaUnderstandingProvider } from "../../types";
import { transcribeOpenAiCompatibleAudio } from "../openai-compatible-audio";

const DEFAULT_GROQ_AUDIO_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_AUDIO_MODEL = "whisper-large-v3-turbo";

export const groqProvider: MediaUnderstandingProvider = {
  id: "groq",
  capabilities: ["audio"],
  transcribeAudio: (req) =>
    transcribeOpenAiCompatibleAudio({
      ...req,
      baseUrl: req.baseUrl ?? DEFAULT_GROQ_AUDIO_BASE_URL,
      defaultBaseUrl: DEFAULT_GROQ_AUDIO_BASE_URL,
      defaultModel: DEFAULT_GROQ_AUDIO_MODEL,
    }),
};
