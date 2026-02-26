import type { PowerDirectorConfig } from '../config/config';
import { getMemorySearchManager, type MemoryIndexManager } from './index';

export async function createMemoryManagerOrThrow(
  cfg: PowerDirectorConfig,
  agentId = "main",
): Promise<MemoryIndexManager> {
  const result = await getMemorySearchManager({ cfg, agentId });
  if (!result.manager) {
    throw new Error("manager missing");
  }
  return result.manager as unknown as MemoryIndexManager;
}
