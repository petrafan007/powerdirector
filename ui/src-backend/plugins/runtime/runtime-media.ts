import { isVoiceCompatibleAudio } from "../../media/audio";
import { mediaKindFromMime } from "../../media/constants";
import { getImageMetadata, resizeToJpeg } from "../../media/image-ops";
import { detectMime } from "../../media/mime";
import { loadWebMedia } from "../../media/web-media";
import type { PluginRuntime } from "./types";

export function createRuntimeMedia(): PluginRuntime["media"] {
  return {
    loadWebMedia,
    detectMime,
    mediaKindFromMime,
    isVoiceCompatibleAudio,
    getImageMetadata,
    resizeToJpeg,
  };
}
