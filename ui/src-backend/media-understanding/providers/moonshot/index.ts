import type { MediaUnderstandingProvider } from "../../types";
import { describeImageWithModel } from "../image";
import { describeMoonshotVideo } from "./video";

export const moonshotProvider: MediaUnderstandingProvider = {
  id: "moonshot",
  capabilities: ["image", "video"],
  describeImage: describeImageWithModel,
  describeVideo: describeMoonshotVideo,
};
