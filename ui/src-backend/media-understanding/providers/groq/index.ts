import type { MediaUnderstandingProvider } from '../../types';
import { transcribeOpenAiCompatibleAudio } from '../openai/audio';

const DEFAULT_GROQ_AUDIO_BASE_URL = "https://api.groq.com/openai/v1";

export const groqProvider: MediaUnderstandingProvider = {
  id: "groq",
  capabilities: ["audio"],
  transcribeAudio: (req) =>
    transcribeOpenAiCompatibleAudio({
      ...req,
      baseUrl: req.baseUrl ?? DEFAULT_GROQ_AUDIO_BASE_URL,
    }),
};
