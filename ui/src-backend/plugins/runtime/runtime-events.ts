import { onAgentEvent } from "../../infra/agent-events";
import { onSessionTranscriptUpdate } from "../../sessions/transcript-events";
import type { PluginRuntime } from "./types";

export function createRuntimeEvents(): PluginRuntime["events"] {
  return {
    onAgentEvent,
    onSessionTranscriptUpdate,
  };
}
