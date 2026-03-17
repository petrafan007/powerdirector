import type { MediaUnderstandingProvider } from '../../types';
import { describeImageWithModel } from '../image';

export const minimaxProvider: MediaUnderstandingProvider = {
  id: "minimax",
  capabilities: ["image"],
  describeImage: describeImageWithModel,
};
