import { inspectSlackAccount as inspectSlackAccountImpl } from "powerdirector/plugin-sdk/slack";

export type { InspectedSlackAccount } from "powerdirector/plugin-sdk/slack";

type InspectSlackAccount = typeof import("powerdirector/plugin-sdk/slack").inspectSlackAccount;

export function inspectSlackAccount(
  ...args: Parameters<InspectSlackAccount>
): ReturnType<InspectSlackAccount> {
  return inspectSlackAccountImpl(...args);
}
