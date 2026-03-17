import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signalPlugin } from '../../extensions/signal/src/channel';
import { setActivePluginRegistry } from '../plugins/runtime';
import { createTestRegistry } from '../test-utils/channel-plugins';
import { createIMessageTestPlugin } from '../test-utils/imessage-test-plugin';
import { formatGatewayChannelsStatusLines } from './channels/status';

describe("channels command", () => {
  beforeEach(() => {
    setActivePluginRegistry(
      createTestRegistry([{ pluginId: "signal", source: "test", plugin: signalPlugin }]),
    );
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
  });

  it("surfaces Signal runtime errors in channels status output", () => {
    const lines = formatGatewayChannelsStatusLines({
      channelAccounts: {
        signal: [
          {
            accountId: "default",
            enabled: true,
            configured: true,
            running: false,
            lastError: "signal-cli unreachable",
          },
        ],
      },
    });
    expect(lines.join("\n")).toMatch(/Warnings:/);
    expect(lines.join("\n")).toMatch(/signal/i);
    expect(lines.join("\n")).toMatch(/Channel error/i);
  });

  it("surfaces iMessage runtime errors in channels status output", () => {
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "imessage",
          source: "test",
          plugin: createIMessageTestPlugin(),
        },
      ]),
    );
    const lines = formatGatewayChannelsStatusLines({
      channelAccounts: {
        imessage: [
          {
            accountId: "default",
            enabled: true,
            configured: true,
            running: false,
            lastError: "imsg permission denied",
          },
        ],
      },
    });
    expect(lines.join("\n")).toMatch(/Warnings:/);
    expect(lines.join("\n")).toMatch(/imessage/i);
    expect(lines.join("\n")).toMatch(/Channel error/i);
  });
});
