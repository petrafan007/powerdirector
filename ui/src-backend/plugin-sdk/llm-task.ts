// Narrow plugin-sdk surface for the bundled llm-task plugin.
// Keep this list additive and scoped to symbols used under extensions/llm-task.

export { definePluginEntry } from "./core";
export { resolvePreferredPowerDirectorTmpDir } from "../infra/tmp-powerdirector-dir";
export {
  formatThinkingLevels,
  formatXHighModelHint,
  normalizeThinkLevel,
  supportsXHighThinking,
} from "../auto-reply/thinking";
export type { AnyAgentTool, PowerDirectorPluginApi } from "../plugins/types";
