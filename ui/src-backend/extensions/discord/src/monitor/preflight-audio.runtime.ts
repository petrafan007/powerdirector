import { transcribeFirstAudio as transcribeFirstAudioImpl } from "@/src-backend/plugin-sdk/media-runtime";

type TranscribeFirstAudio = typeof import("@/src-backend/plugin-sdk/media-runtime").transcribeFirstAudio;

export async function transcribeFirstAudio(
  ...args: Parameters<TranscribeFirstAudio>
): ReturnType<TranscribeFirstAudio> {
  return await transcribeFirstAudioImpl(...args);
}
