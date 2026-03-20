import { vi } from "vitest";
import { parseTelegramTarget } from "@/src-backend/extensions/telegram/api";
import { signalOutbound, telegramOutbound } from "../../test/channel-outbounds";
import { loadModelCatalog } from "../agents/model-catalog";
import { runEmbeddedPiAgent } from "../agents/pi-embedded";
import { runSubagentAnnounceFlow } from "../agents/subagent-announce";
import { callGateway } from "../gateway/call";
import { setActivePluginRegistry } from "../plugins/runtime";
import { createOutboundTestPlugin, createTestRegistry } from "../test-utils/channel-plugins";

export function setupIsolatedAgentTurnMocks(params?: { fast?: boolean }): void {
  if (params?.fast) {
    vi.stubEnv("POWERDIRECTOR_TEST_FAST", "1");
  }
  vi.mocked(runEmbeddedPiAgent).mockReset();
  vi.mocked(loadModelCatalog).mockResolvedValue([]);
  vi.mocked(runSubagentAnnounceFlow).mockReset().mockResolvedValue(true);
  vi.mocked(callGateway).mockReset().mockResolvedValue({ ok: true, deleted: true });
  setActivePluginRegistry(
    createTestRegistry([
      {
        pluginId: "telegram",
        plugin: createOutboundTestPlugin({
          id: "telegram",
          outbound: telegramOutbound,
          messaging: {
            parseExplicitTarget: ({ raw }) => {
              const target = parseTelegramTarget(raw);
              return {
                to: target.chatId,
                threadId: target.messageThreadId,
                chatType: target.chatType === "unknown" ? undefined : target.chatType,
              };
            },
          },
        }),
        source: "test",
      },
      {
        pluginId: "signal",
        plugin: createOutboundTestPlugin({ id: "signal", outbound: signalOutbound }),
        source: "test",
      },
    ]),
  );
}
