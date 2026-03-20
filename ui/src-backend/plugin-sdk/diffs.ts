// Narrow plugin-sdk surface for the bundled diffs plugin.
// Keep this list additive and scoped to symbols used under extensions/diffs.

export { definePluginEntry } from "./core";
export type { PowerDirectorConfig } from "../config/config";
export { resolvePreferredPowerDirectorTmpDir } from "../infra/tmp-powerdirector-dir";
export type {
  AnyAgentTool,
  PowerDirectorPluginApi,
  PowerDirectorPluginConfigSchema,
  PowerDirectorPluginToolContext,
  PluginLogger,
} from "../plugins/types";
