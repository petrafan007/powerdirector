import { discordPlugin } from '../../extensions/discord/src/channel';
import { imessagePlugin } from '../../extensions/imessage/src/channel';
import { signalPlugin } from '../../extensions/signal/src/channel';
import { slackPlugin } from '../../extensions/slack/src/channel';
import { telegramPlugin } from '../../extensions/telegram/src/channel';
import { whatsappPlugin } from '../../extensions/whatsapp/src/channel';
import { setActivePluginRegistry } from '../plugins/runtime';
import { createTestRegistry } from '../test-utils/channel-plugins';

export function setDefaultChannelPluginRegistryForTests(): void {
  const channels = [
    { pluginId: "discord", plugin: discordPlugin, source: "test" },
    { pluginId: "slack", plugin: slackPlugin, source: "test" },
    { pluginId: "telegram", plugin: telegramPlugin, source: "test" },
    { pluginId: "whatsapp", plugin: whatsappPlugin, source: "test" },
    { pluginId: "signal", plugin: signalPlugin, source: "test" },
    { pluginId: "imessage", plugin: imessagePlugin, source: "test" },
  ] as unknown as Parameters<typeof createTestRegistry>[0];
  setActivePluginRegistry(createTestRegistry(channels));
}
