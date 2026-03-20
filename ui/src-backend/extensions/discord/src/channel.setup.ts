import { type ResolvedDiscordAccount } from "./accounts";
import { type ChannelPlugin } from "./runtime-api";
import { discordSetupAdapter } from "./setup-core";
import { createDiscordPluginBase } from "./shared";

export const discordSetupPlugin: ChannelPlugin<ResolvedDiscordAccount> = {
  ...createDiscordPluginBase({
    setup: discordSetupAdapter,
  }),
};
