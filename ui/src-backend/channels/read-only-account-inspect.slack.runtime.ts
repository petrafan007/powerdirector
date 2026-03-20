import { inspectSlackAccount as inspectSlackAccountImpl } from "@/src-backend/plugin-sdk/slack";

export type { InspectedSlackAccount } from "@/src-backend/plugin-sdk/slack";

type InspectSlackAccount = typeof import("@/src-backend/plugin-sdk/slack").inspectSlackAccount;

export function inspectSlackAccount(
  ...args: Parameters<InspectSlackAccount>
): ReturnType<InspectSlackAccount> {
  return inspectSlackAccountImpl(...args);
}
