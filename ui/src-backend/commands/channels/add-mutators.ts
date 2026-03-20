import { getChannelPlugin } from "../../channels/plugins/index";
import type { ChannelId, ChannelPlugin, ChannelSetupInput } from "../../channels/plugins/types";
import type { PowerDirectorConfig } from "../../config/config";
import { normalizeAccountId } from "../../routing/session-key";

type ChatChannel = ChannelId;

export function applyAccountName(params: {
  cfg: PowerDirectorConfig;
  channel: ChatChannel;
  accountId: string;
  name?: string;
  plugin?: ChannelPlugin;
}): PowerDirectorConfig {
  const accountId = normalizeAccountId(params.accountId);
  const plugin = params.plugin ?? getChannelPlugin(params.channel);
  const apply = plugin?.setup?.applyAccountName;
  return apply ? apply({ cfg: params.cfg, accountId, name: params.name }) : params.cfg;
}

export function applyChannelAccountConfig(params: {
  cfg: PowerDirectorConfig;
  channel: ChatChannel;
  accountId: string;
  input: ChannelSetupInput;
  plugin?: ChannelPlugin;
}): PowerDirectorConfig {
  const accountId = normalizeAccountId(params.accountId);
  const plugin = params.plugin ?? getChannelPlugin(params.channel);
  const apply = plugin?.setup?.applyAccountConfig;
  if (!apply) {
    return params.cfg;
  }
  return apply({ cfg: params.cfg, accountId, input: params.input });
}
