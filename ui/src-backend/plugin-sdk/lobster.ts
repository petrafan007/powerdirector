// Public Lobster plugin helpers.
// Keep this surface narrow and limited to the Lobster workflow/tool contract.

export { definePluginEntry } from "./core";
export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "./windows-spawn";
export type {
  AnyAgentTool,
  PowerDirectorPluginApi,
  PowerDirectorPluginToolContext,
  PowerDirectorPluginToolFactory,
} from "../plugins/types";
