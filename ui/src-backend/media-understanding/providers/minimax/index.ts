import type { MediaUnderstandingProvider } from "../../types";
import { describeImageWithModel } from "../image";

export const minimaxProvider: MediaUnderstandingProvider = {
  id: "minimax",
  capabilities: ["image"],
  describeImage: describeImageWithModel,
};

export const minimaxPortalProvider: MediaUnderstandingProvider = {
  id: "minimax-portal",
  capabilities: ["image"],
  describeImage: describeImageWithModel,
};
