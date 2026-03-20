import type { PowerDirectorConfig } from "../config/config";
import type { ChannelId } from "./plugins/types";

type DiscordInspectModule = typeof import("./read-only-account-inspect.discord.runtime");
type SlackInspectModule = typeof import("./read-only-account-inspect.slack.runtime");
type TelegramInspectModule = typeof import("./read-only-account-inspect.telegram.runtime");

let discordInspectModulePromise: Promise<DiscordInspectModule> | undefined;
let slackInspectModulePromise: Promise<SlackInspectModule> | undefined;
let telegramInspectModulePromise: Promise<TelegramInspectModule> | undefined;

function loadDiscordInspectModule() {
  discordInspectModulePromise ??= import("./read-only-account-inspect.discord.runtime");
  return discordInspectModulePromise;
}

function loadSlackInspectModule() {
  slackInspectModulePromise ??= import("./read-only-account-inspect.slack.runtime");
  return slackInspectModulePromise;
}

function loadTelegramInspectModule() {
  telegramInspectModulePromise ??= import("./read-only-account-inspect.telegram.runtime");
  return telegramInspectModulePromise;
}

export type ReadOnlyInspectedAccount =
  | Awaited<ReturnType<DiscordInspectModule["inspectDiscordAccount"]>>
  | Awaited<ReturnType<SlackInspectModule["inspectSlackAccount"]>>
  | Awaited<ReturnType<TelegramInspectModule["inspectTelegramAccount"]>>;

export async function inspectReadOnlyChannelAccount(params: {
  channelId: ChannelId;
  cfg: PowerDirectorConfig;
  accountId?: string | null;
}): Promise<ReadOnlyInspectedAccount | null> {
  if (params.channelId === "discord") {
    const { inspectDiscordAccount } = await loadDiscordInspectModule();
    return inspectDiscordAccount({
      cfg: params.cfg,
      accountId: params.accountId,
    });
  }
  if (params.channelId === "slack") {
    const { inspectSlackAccount } = await loadSlackInspectModule();
    return inspectSlackAccount({
      cfg: params.cfg,
      accountId: params.accountId,
    });
  }
  if (params.channelId === "telegram") {
    const { inspectTelegramAccount } = await loadTelegramInspectModule();
    return inspectTelegramAccount({
      cfg: params.cfg,
      accountId: params.accountId,
    });
  }
  return null;
}
