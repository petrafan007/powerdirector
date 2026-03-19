// Narrow plugin-sdk surface for the bundled diffs plugin.
// Keep this list additive and scoped to symbols used under extensions/diffs.

export { definePluginEntry } from "./core.js";
export type { PowerDirectorConfig } from "../config/config.js";
export { resolvePreferredPowerDirectorTmpDir } from "../infra/tmp-powerdirector-dir.js";
export type {
  AnyAgentTool,
  PowerDirectorPluginApi,
  PowerDirectorPluginConfigSchema,
  PowerDirectorPluginToolContext,
  PluginLogger,
} from "../plugins/types.js";
