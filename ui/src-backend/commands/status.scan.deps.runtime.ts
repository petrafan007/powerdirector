import type { PowerDirectorConfig } from "../config/config";
import { getTailnetHostname } from "../infra/tailscale";
import { getMemorySearchManager as getMemorySearchManagerImpl } from "../memory/index";
import type { MemoryProviderStatus } from "../memory/types";

export { getTailnetHostname };

type StatusMemoryManager = {
  probeVectorAvailability(): Promise<boolean>;
  status(): MemoryProviderStatus;
  close?(): Promise<void>;
};

export async function getMemorySearchManager(params: {
  cfg: PowerDirectorConfig;
  agentId: string;
  purpose: "status";
}): Promise<{ manager: StatusMemoryManager | null }> {
  const { manager } = await getMemorySearchManagerImpl(params);
  if (!manager) {
    return { manager: null };
  }
  return {
    manager: {
      async probeVectorAvailability() {
        return await manager.probeVectorAvailability();
      },
      status() {
        return manager.status();
      },
      close: manager.close ? async () => await manager.close?.() : undefined,
    },
  };
}
