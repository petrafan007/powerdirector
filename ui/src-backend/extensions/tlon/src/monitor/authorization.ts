import type { PowerDirectorConfig } from "../../api";
import type { TlonSettingsStore } from "../settings";

type ChannelAuthorization = {
  mode?: "restricted" | "open";
  allowedShips?: string[];
};

export function resolveChannelAuthorization(
  cfg: PowerDirectorConfig,
  channelNest: string,
  settings?: TlonSettingsStore,
): { mode: "restricted" | "open"; allowedShips: string[] } {
  const tlonConfig = cfg.channels?.tlon as
    | {
        authorization?: { channelRules?: Record<string, ChannelAuthorization> };
        defaultAuthorizedShips?: string[];
      }
    | undefined;

  const fileRules = tlonConfig?.authorization?.channelRules ?? {};
  const settingsRules = settings?.channelRules ?? {};
  const rule = settingsRules[channelNest] ?? fileRules[channelNest];
  const defaultShips = settings?.defaultAuthorizedShips ?? tlonConfig?.defaultAuthorizedShips ?? [];

  return {
    mode: rule?.mode ?? "restricted",
    allowedShips: rule?.allowedShips ?? defaultShips,
  };
}
