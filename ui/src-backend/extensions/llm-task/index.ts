import { definePluginEntry, type AnyAgentTool, type PowerDirectorPluginApi } from "./api";
import { createLlmTaskTool } from "./src/llm-task-tool";

export default definePluginEntry({
  id: "llm-task",
  name: "LLM Task",
  description: "Optional tool for structured subtask execution",
  register(api: PowerDirectorPluginApi) {
    api.registerTool(createLlmTaskTool(api) as unknown as AnyAgentTool, { optional: true });
  },
});
