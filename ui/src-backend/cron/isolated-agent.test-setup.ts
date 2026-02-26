import { vi } from "vitest";
import { loadModelCatalog } from '../agents/model-catalog';
import { runEmbeddedPiAgent } from '../agents/pi-embedded';
import { runSubagentAnnounceFlow } from '../agents/subagent-announce';
import { telegramOutbound } from '../channels/plugins/outbound/telegram';
import { setActivePluginRegistry } from '../plugins/runtime';
import { createOutboundTestPlugin, createTestRegistry } from '../test-utils/channel-plugins';

export function setupIsolatedAgentTurnMocks(params?: { fast?: boolean }): void {
  if (params?.fast) {
    vi.stubEnv("POWERDIRECTOR_TEST_FAST", "1");
  }
  vi.mocked(runEmbeddedPiAgent).mockReset();
  vi.mocked(loadModelCatalog).mockResolvedValue([]);
  vi.mocked(runSubagentAnnounceFlow).mockReset().mockResolvedValue(true);
  setActivePluginRegistry(
    createTestRegistry([
      {
        pluginId: "telegram",
        plugin: createOutboundTestPlugin({ id: "telegram", outbound: telegramOutbound }),
        source: "test",
      },
    ]),
  );
}
