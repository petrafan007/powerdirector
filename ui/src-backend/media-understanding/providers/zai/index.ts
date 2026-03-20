import type { MediaUnderstandingProvider } from "../../types";
import { describeImageWithModel } from "../image";

export const zaiProvider: MediaUnderstandingProvider = {
  id: "zai",
  capabilities: ["image"],
  describeImage: describeImageWithModel,
};
