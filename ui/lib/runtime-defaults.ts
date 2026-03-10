import type { PowerDirectorConfig } from "../src-backend/config/config";
import { resolveDefaultAgentId, resolveAgentWorkspaceDir } from "../src-backend/agents/agent-scope";

export function resolveServiceWorkspaceDir(config: PowerDirectorConfig): string {
  const cfg = (config ?? {}) as PowerDirectorConfig;
  return resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
}
