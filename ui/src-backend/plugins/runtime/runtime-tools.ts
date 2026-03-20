import { createMemoryGetTool, createMemorySearchTool } from "../../agents/tools/memory-tool";
import { registerMemoryCli } from "../../cli/memory-cli";
import type { PluginRuntime } from "./types";

export function createRuntimeTools(): PluginRuntime["tools"] {
  return {
    createMemoryGetTool,
    createMemorySearchTool,
    registerMemoryCli,
  };
}
