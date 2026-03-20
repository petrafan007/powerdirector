import { bluebubblesPlugin } from "@/src-backend/extensions/bluebubbles/index";
import { discordPlugin, setDiscordRuntime } from "@/src-backend/extensions/discord/index";
import { discordSetupPlugin } from "@/src-backend/extensions/discord/setup-entry";
import { feishuPlugin } from "@/src-backend/extensions/feishu/index";
import { imessagePlugin } from "@/src-backend/extensions/imessage/index";
import { imessageSetupPlugin } from "@/src-backend/extensions/imessage/setup-entry";
import { ircPlugin } from "@/src-backend/extensions/irc/index";
import { linePlugin, setLineRuntime } from "@/src-backend/extensions/line/index";
import { lineSetupPlugin } from "@/src-backend/extensions/line/setup-entry";
import { mattermostPlugin } from "@/src-backend/extensions/mattermost/index";
import { nextcloudTalkPlugin } from "@/src-backend/extensions/nextcloud-talk/index";
import { signalPlugin } from "@/src-backend/extensions/signal/index";
import { signalSetupPlugin } from "@/src-backend/extensions/signal/setup-entry";
import { slackPlugin } from "@/src-backend/extensions/slack/index";
import { slackSetupPlugin } from "@/src-backend/extensions/slack/setup-entry";
import { synologyChatPlugin } from "@/src-backend/extensions/synology-chat/index";
import { telegramPlugin, setTelegramRuntime } from "@/src-backend/extensions/telegram/index";
import { telegramSetupPlugin } from "@/src-backend/extensions/telegram/setup-entry";
import { zaloPlugin } from "@/src-backend/extensions/zalo/index";
import type { ChannelId, ChannelPlugin } from "./types";

export const bundledChannelPlugins = [
  bluebubblesPlugin,
  discordPlugin,
  feishuPlugin,
  imessagePlugin,
  ircPlugin,
  linePlugin,
  mattermostPlugin,
  nextcloudTalkPlugin,
  signalPlugin,
  slackPlugin,
  synologyChatPlugin,
  telegramPlugin,
  zaloPlugin,
] as ChannelPlugin[];

export const bundledChannelSetupPlugins = [
  telegramSetupPlugin,
  discordSetupPlugin,
  ircPlugin,
  slackSetupPlugin,
  signalSetupPlugin,
  imessageSetupPlugin,
  lineSetupPlugin,
] as ChannelPlugin[];

const bundledChannelPluginsById = new Map(
  bundledChannelPlugins.map((plugin) => [plugin.id, plugin] as const),
);

export function getBundledChannelPlugin(id: ChannelId): ChannelPlugin | undefined {
  return bundledChannelPluginsById.get(id);
}

export function requireBundledChannelPlugin(id: ChannelId): ChannelPlugin {
  const plugin = getBundledChannelPlugin(id);
  if (!plugin) {
    throw new Error(`missing bundled channel plugin: ${id}`);
  }
  return plugin;
}

export const bundledChannelRuntimeSetters = {
  setDiscordRuntime,
  setLineRuntime,
  setTelegramRuntime,
};
