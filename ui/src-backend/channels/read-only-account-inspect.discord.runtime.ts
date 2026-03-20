import { inspectDiscordAccount as inspectDiscordAccountImpl } from "@/src-backend/plugin-sdk/discord";

export type { InspectedDiscordAccount } from "@/src-backend/plugin-sdk/discord";

type InspectDiscordAccount = typeof import("@/src-backend/plugin-sdk/discord").inspectDiscordAccount;

export function inspectDiscordAccount(
  ...args: Parameters<InspectDiscordAccount>
): ReturnType<InspectDiscordAccount> {
  return inspectDiscordAccountImpl(...args);
}
