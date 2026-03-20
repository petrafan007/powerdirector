import { resolveAgentDir, resolveAgentWorkspaceDir } from "../../agents/agent-scope";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../../agents/defaults";
import { resolveAgentIdentity } from "../../agents/identity";
import { resolveThinkingDefault } from "../../agents/model-selection";
import { runEmbeddedPiAgent } from "../../agents/pi-embedded";
import { resolveAgentTimeoutMs } from "../../agents/timeout";
import { ensureAgentWorkspace } from "../../agents/workspace";
import {
  loadSessionStore,
  resolveSessionFilePath,
  resolveStorePath,
  saveSessionStore,
} from "../../config/sessions";
import type { PluginRuntime } from "./types";

export function createRuntimeAgent(): PluginRuntime["agent"] {
  return {
    defaults: {
      model: DEFAULT_MODEL,
      provider: DEFAULT_PROVIDER,
    },
    resolveAgentDir,
    resolveAgentWorkspaceDir,
    resolveAgentIdentity,
    resolveThinkingDefault,
    runEmbeddedPiAgent,
    resolveAgentTimeoutMs,
    ensureAgentWorkspace,
    session: {
      resolveStorePath,
      loadSessionStore,
      saveSessionStore,
      resolveSessionFilePath,
    },
  };
}
