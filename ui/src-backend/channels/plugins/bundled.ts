import { bluebubblesPlugin } from "powerdirector/extensions/bluebubbles/index";
import { discordPlugin, setDiscordRuntime } from "powerdirector/extensions/discord/index";
import { discordSetupPlugin } from "powerdirector/extensions/discord/setup-entry";
import { feishuPlugin } from "powerdirector/extensions/feishu/index";
import { imessagePlugin } from "powerdirector/extensions/imessage/index";
import { imessageSetupPlugin } from "powerdirector/extensions/imessage/setup-entry";
import { ircPlugin } from "powerdirector/extensions/irc/index";
import { linePlugin, setLineRuntime } from "powerdirector/extensions/line/index";
import { lineSetupPlugin } from "powerdirector/extensions/line/setup-entry";
import { mattermostPlugin } from "powerdirector/extensions/mattermost/index";
import { nextcloudTalkPlugin } from "powerdirector/extensions/nextcloud-talk/index";
import { signalPlugin } from "powerdirector/extensions/signal/index";
import { signalSetupPlugin } from "powerdirector/extensions/signal/setup-entry";
import { slackPlugin } from "powerdirector/extensions/slack/index";
import { slackSetupPlugin } from "powerdirector/extensions/slack/setup-entry";
import { synologyChatPlugin } from "powerdirector/extensions/synology-chat/index";
import { telegramPlugin, setTelegramRuntime } from "powerdirector/extensions/telegram/index";
import { telegramSetupPlugin } from "powerdirector/extensions/telegram/setup-entry";
import { zaloPlugin } from "powerdirector/extensions/zalo/index";
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
