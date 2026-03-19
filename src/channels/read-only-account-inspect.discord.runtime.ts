import { inspectDiscordAccount as inspectDiscordAccountImpl } from "powerdirector/plugin-sdk/discord";

export type { InspectedDiscordAccount } from "powerdirector/plugin-sdk/discord";

type InspectDiscordAccount = typeof import("powerdirector/plugin-sdk/discord").inspectDiscordAccount;

export function inspectDiscordAccount(
  ...args: Parameters<InspectDiscordAccount>
): ReturnType<InspectDiscordAccount> {
  return inspectDiscordAccountImpl(...args);
}
