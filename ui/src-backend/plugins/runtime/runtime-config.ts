import { loadConfig, writeConfigFile } from "../../config/config";
import type { PluginRuntime } from "./types";

export function createRuntimeConfig(): PluginRuntime["config"] {
  return {
    loadConfig,
    writeConfigFile,
  };
}
