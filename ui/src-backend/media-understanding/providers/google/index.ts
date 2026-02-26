import type { MediaUnderstandingProvider } from '../../types';
import { describeImageWithModel } from '../image';
import { transcribeGeminiAudio } from './audio';
import { describeGeminiVideo } from './video';

export const googleProvider: MediaUnderstandingProvider = {
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: describeImageWithModel,
  transcribeAudio: transcribeGeminiAudio,
  describeVideo: describeGeminiVideo,
};
