import { createAccountListHelpers } from "../channels/plugins/account-helpers";
import type { PowerDirectorConfig } from "../config/config";
import type { SignalAccountConfig } from "../config/types";
import { resolveAccountEntry } from "../routing/account-lookup";
import { normalizeAccountId } from "../routing/session-key";

export type ResolvedSignalAccount = {
  accountId: string;
  enabled: boolean;
  name?: string;
  baseUrl: string;
  configured: boolean;
  config: SignalAccountConfig;
};

const { listAccountIds, resolveDefaultAccountId } = createAccountListHelpers("signal");
export const listSignalAccountIds = listAccountIds;
export const resolveDefaultSignalAccountId = resolveDefaultAccountId;

function resolveAccountConfig(
  cfg: PowerDirectorConfig,
  accountId: string,
): SignalAccountConfig | undefined {
  return resolveAccountEntry(cfg.channels?.signal?.accounts, accountId);
}

function mergeSignalAccountConfig(cfg: PowerDirectorConfig, accountId: string): SignalAccountConfig {
  const { accounts: _ignored, ...base } = (cfg.channels?.signal ?? {}) as SignalAccountConfig & {
    accounts?: unknown;
  };
  const account = resolveAccountConfig(cfg, accountId) ?? {};
  return { ...base, ...account };
}

export function resolveSignalAccount(params: {
  cfg: PowerDirectorConfig;
  accountId?: string | null;
}): ResolvedSignalAccount {
  const accountId = normalizeAccountId(params.accountId);
  const baseEnabled = params.cfg.channels?.signal?.enabled !== false;
  const merged = mergeSignalAccountConfig(params.cfg, accountId);
  const accountEnabled = merged.enabled !== false;
  const enabled = baseEnabled && accountEnabled;
  const host = merged.httpHost?.trim() || "127.0.0.1";
  const port = merged.httpPort ?? 8080;
  const baseUrl = merged.httpUrl?.trim() || `http://${host}:${port}`;
  const configured = Boolean(
    merged.account?.trim() ||
    merged.httpUrl?.trim() ||
    merged.cliPath?.trim() ||
    merged.httpHost?.trim() ||
    typeof merged.httpPort === "number" ||
    typeof merged.autoStart === "boolean",
  );
  return {
    accountId,
    enabled,
    name: merged.name?.trim() || undefined,
    baseUrl,
    configured,
    config: merged,
  };
}

export function listEnabledSignalAccounts(cfg: PowerDirectorConfig): ResolvedSignalAccount[] {
  return listSignalAccountIds(cfg)
    .map((accountId) => resolveSignalAccount({ cfg, accountId }))
    .filter((account) => account.enabled);
}
