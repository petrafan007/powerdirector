import type { MediaUnderstandingProvider } from "../../types";
import { describeImageWithModel } from "../image";
import { transcribeOpenAiCompatibleAudio } from "./audio";

export const openaiProvider: MediaUnderstandingProvider = {
  id: "openai",
  capabilities: ["image", "audio"],
  describeImage: describeImageWithModel,
  transcribeAudio: transcribeOpenAiCompatibleAudio,
};
