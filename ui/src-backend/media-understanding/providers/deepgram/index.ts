import type { MediaUnderstandingProvider } from "../../types";
import { transcribeDeepgramAudio } from "./audio";

export const deepgramProvider: MediaUnderstandingProvider = {
  id: "deepgram",
  capabilities: ["audio"],
  transcribeAudio: transcribeDeepgramAudio,
};
