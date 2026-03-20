import { vi } from "vitest";

export function installSubagentsCommandCoreMocks() {
  vi.mock("../../config/config", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../config/config")>();
    return {
      ...actual,
      loadConfig: () => ({}),
    };
  });

  // Prevent transitive import chain from reaching discord/monitor which needs https-proxy-agent.
  vi.mock("@/src-backend/extensions/discord/runtime-api", () => ({
    createDiscordGatewayPlugin: () => ({}),
  }));
}
