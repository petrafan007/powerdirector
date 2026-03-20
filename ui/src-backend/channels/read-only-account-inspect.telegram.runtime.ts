import { inspectTelegramAccount as inspectTelegramAccountImpl } from "@/src-backend/plugin-sdk/telegram";

export type { InspectedTelegramAccount } from "@/src-backend/plugin-sdk/telegram";

type InspectTelegramAccount = typeof import("@/src-backend/plugin-sdk/telegram").inspectTelegramAccount;

export function inspectTelegramAccount(
  ...args: Parameters<InspectTelegramAccount>
): ReturnType<InspectTelegramAccount> {
  return inspectTelegramAccountImpl(...args);
}
