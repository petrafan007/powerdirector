import { formatCliCommand } from '../../cli/command-format';
import type { PowerDirectorConfig } from '../../config/config';
import { DEFAULT_ACCOUNT_ID } from '../../routing/session-key';
import type { ChannelPlugin } from './types';

// Channel docking helper: use this when selecting the default account for a plugin.
export function resolveChannelDefaultAccountId<ResolvedAccount>(params: {
  plugin: ChannelPlugin<ResolvedAccount>;
  cfg: PowerDirectorConfig;
  accountIds?: string[];
}): string {
  const accountIds = params.accountIds ?? params.plugin.config.listAccountIds(params.cfg);
  return params.plugin.config.defaultAccountId?.(params.cfg) ?? accountIds[0] ?? DEFAULT_ACCOUNT_ID;
}

export function formatPairingApproveHint(channelId: string): string {
  const listCmd = formatCliCommand(`powerdirector pairing list ${channelId}`);
  const approveCmd = formatCliCommand(`powerdirector pairing approve ${channelId} <code>`);
  return `Approve via: ${listCmd} / ${approveCmd}`;
}
