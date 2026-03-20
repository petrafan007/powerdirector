import { beforeEach } from "vitest";
import { slackPlugin, setSlackRuntime } from "@/src-backend/extensions/slack/index";
import { telegramPlugin, setTelegramRuntime } from "@/src-backend/extensions/telegram/index";
import { whatsappPlugin, setWhatsAppRuntime } from "@/src-backend/extensions/whatsapp/index";
import type { ChannelPlugin } from "../channels/plugins/types.plugin";
import { setActivePluginRegistry } from "../plugins/runtime";
import { createPluginRuntime } from "../plugins/runtime/index";
import { createTestRegistry } from "../test-utils/channel-plugins";

const slackChannelPlugin = slackPlugin as unknown as ChannelPlugin;
const telegramChannelPlugin = telegramPlugin as unknown as ChannelPlugin;
const whatsappChannelPlugin = whatsappPlugin as unknown as ChannelPlugin;

export function installHeartbeatRunnerTestRuntime(params?: { includeSlack?: boolean }): void {
  beforeEach(() => {
    const runtime = createPluginRuntime();
    setTelegramRuntime(runtime);
    setWhatsAppRuntime(runtime);
    if (params?.includeSlack) {
      setSlackRuntime(runtime);
      setActivePluginRegistry(
        createTestRegistry([
          { pluginId: "slack", plugin: slackChannelPlugin, source: "test" },
          { pluginId: "whatsapp", plugin: whatsappChannelPlugin, source: "test" },
          { pluginId: "telegram", plugin: telegramChannelPlugin, source: "test" },
        ]),
      );
      return;
    }
    setActivePluginRegistry(
      createTestRegistry([
        { pluginId: "whatsapp", plugin: whatsappChannelPlugin, source: "test" },
        { pluginId: "telegram", plugin: telegramChannelPlugin, source: "test" },
      ]),
    );
  });
}
