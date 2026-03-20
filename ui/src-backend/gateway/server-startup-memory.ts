import { listAgentIds } from "../agents/agent-scope";
import { resolveMemorySearchConfig } from "../agents/memory-search";
import type { PowerDirectorConfig } from "../config/config";
import { resolveMemoryBackendConfig } from "../memory/backend-config";
import { getMemorySearchManager } from "../memory/index";

export async function startGatewayMemoryBackend(params: {
  cfg: PowerDirectorConfig;
  log: { info?: (msg: string) => void; warn: (msg: string) => void };
}): Promise<void> {
  const agentIds = listAgentIds(params.cfg);
  for (const agentId of agentIds) {
    if (!resolveMemorySearchConfig(params.cfg, agentId)) {
      continue;
    }
    const resolved = resolveMemoryBackendConfig({ cfg: params.cfg, agentId });
    if (resolved.backend !== "qmd" || !resolved.qmd) {
      continue;
    }

    const { manager, error } = await getMemorySearchManager({ cfg: params.cfg, agentId });
    if (!manager) {
      params.log.warn(
        `qmd memory startup initialization failed for agent "${agentId}": ${error ?? "unknown error"}`,
      );
      continue;
    }
    params.log.info?.(`qmd memory startup initialization armed for agent "${agentId}"`);
  }
}
