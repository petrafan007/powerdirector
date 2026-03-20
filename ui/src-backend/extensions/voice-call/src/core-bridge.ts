import type { PowerDirectorPluginApi } from "../api";
import type { VoiceCallTtsConfig } from "./config";

export type CoreConfig = {
  session?: {
    store?: string;
  };
  messages?: {
    tts?: VoiceCallTtsConfig;
  };
  [key: string]: unknown;
};

export type CoreAgentDeps = PowerDirectorPluginApi["runtime"]["agent"];
