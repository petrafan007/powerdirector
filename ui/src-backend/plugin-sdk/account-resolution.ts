export type { PowerDirectorConfig } from "../config/config";

export { createAccountActionGate } from "../channels/plugins/account-action-gate";
export { createAccountListHelpers } from "../channels/plugins/account-helpers";
export { normalizeChatType } from "../channels/chat-type";
export { resolveAccountEntry } from "../routing/account-lookup";
export {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  normalizeOptionalAccountId,
} from "../routing/session-key";
export { normalizeE164, pathExists, resolveUserPath } from "../utils";
export {
  resolveDiscordAccount,
  type ResolvedDiscordAccount,
} from "powerdirector/extensions/discord/api";
export { resolveSlackAccount, type ResolvedSlackAccount } from "powerdirector/extensions/slack/api";
export {
  resolveTelegramAccount,
  type ResolvedTelegramAccount,
} from "powerdirector/extensions/telegram/api";
export { resolveSignalAccount, type ResolvedSignalAccount } from "powerdirector/extensions/signal/api";

/** Resolve an account by id, then fall back to the default account when the primary lacks credentials. */
export function resolveAccountWithDefaultFallback<TAccount>(params: {
  accountId?: string | null;
  normalizeAccountId: (accountId?: string | null) => string;
  resolvePrimary: (accountId: string) => TAccount;
  hasCredential: (account: TAccount) => boolean;
  resolveDefaultAccountId: () => string;
}): TAccount {
  const hasExplicitAccountId = Boolean(params.accountId?.trim());
  const normalizedAccountId = params.normalizeAccountId(params.accountId);
  const primary = params.resolvePrimary(normalizedAccountId);
  if (hasExplicitAccountId || params.hasCredential(primary)) {
    return primary;
  }

  const fallbackId = params.resolveDefaultAccountId();
  if (fallbackId === normalizedAccountId) {
    return primary;
  }
  const fallback = params.resolvePrimary(fallbackId);
  if (!params.hasCredential(fallback)) {
    return primary;
  }
  return fallback;
}

/** List normalized configured account ids from a raw channel account record map. */
export function listConfiguredAccountIds(params: {
  accounts: Record<string, unknown> | undefined;
  normalizeAccountId: (accountId: string) => string;
}): string[] {
  if (!params.accounts) {
    return [];
  }
  const ids = new Set<string>();
  for (const key of Object.keys(params.accounts)) {
    if (!key) {
      continue;
    }
    ids.add(params.normalizeAccountId(key));
  }
  return [...ids];
}
