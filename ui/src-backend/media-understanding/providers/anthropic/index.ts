import type { MediaUnderstandingProvider } from "../../types";
import { describeImageWithModel } from "../image";

export const anthropicProvider: MediaUnderstandingProvider = {
  id: "anthropic",
  capabilities: ["image"],
  describeImage: describeImageWithModel,
};
