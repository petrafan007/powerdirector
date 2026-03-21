import { slackPlugin, setSlackRuntime } from "powerdirector/extensions/slack/index";
import { telegramPlugin, setTelegramRuntime } from "powerdirector/extensions/telegram/index";
import type { PowerDirectorConfig } from "../../config/config";
import { setActivePluginRegistry } from "../../plugins/runtime";
import { createPluginRuntime } from "../../plugins/runtime/index";
import { createTestRegistry } from "../../test-utils/channel-plugins";

export const slackConfig = {
  channels: {
    slack: {
      botToken: "xoxb-test",
      appToken: "xapp-test",
    },
  },
} as PowerDirectorConfig;

export const telegramConfig = {
  channels: {
    telegram: {
      botToken: "telegram-test",
    },
  },
} as PowerDirectorConfig;

export function installMessageActionRunnerTestRegistry() {
  const runtime = createPluginRuntime();
  setSlackRuntime(runtime);
  setTelegramRuntime(runtime);
  setActivePluginRegistry(
    createTestRegistry([
      {
        pluginId: "slack",
        source: "test",
        plugin: slackPlugin,
      },
      {
        pluginId: "telegram",
        source: "test",
        plugin: telegramPlugin,
      },
    ]),
  );
}

export function resetMessageActionRunnerTestRegistry() {
  setActivePluginRegistry(createTestRegistry([]));
}
