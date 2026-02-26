import type { PowerDirectorConfig } from '../config/config';
import { ensurePluginAllowlisted } from '../config/plugins-allowlist';

export type PluginEnableResult = {
  config: PowerDirectorConfig;
  enabled: boolean;
  reason?: string;
};

export function enablePluginInConfig(cfg: PowerDirectorConfig, pluginId: string): PluginEnableResult {
  if (cfg.plugins?.enabled === false) {
    return { config: cfg, enabled: false, reason: "plugins disabled" };
  }
  if (cfg.plugins?.deny?.includes(pluginId)) {
    return { config: cfg, enabled: false, reason: "blocked by denylist" };
  }

  const entries = {
    ...cfg.plugins?.entries,
    [pluginId]: {
      ...(cfg.plugins?.entries?.[pluginId] as Record<string, unknown> | undefined),
      enabled: true,
    },
  };
  let next: PowerDirectorConfig = {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      entries,
    },
  };
  next = ensurePluginAllowlisted(next, pluginId);
  return { config: next, enabled: true };
}
