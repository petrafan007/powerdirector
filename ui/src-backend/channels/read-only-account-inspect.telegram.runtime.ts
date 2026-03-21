import { inspectTelegramAccount as inspectTelegramAccountImpl } from "powerdirector/plugin-sdk/telegram";

export type { InspectedTelegramAccount } from "powerdirector/plugin-sdk/telegram";

type InspectTelegramAccount = typeof import("powerdirector/plugin-sdk/telegram").inspectTelegramAccount;

export function inspectTelegramAccount(
  ...args: Parameters<InspectTelegramAccount>
): ReturnType<InspectTelegramAccount> {
  return inspectTelegramAccountImpl(...args);
}
