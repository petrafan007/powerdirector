import type { PowerDirectorConfig } from './config';

export function ensurePluginAllowlisted(cfg: PowerDirectorConfig, pluginId: string): PowerDirectorConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}
