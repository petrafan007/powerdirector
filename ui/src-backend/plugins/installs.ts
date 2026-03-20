import type { PowerDirectorConfig } from "../config/config";
import type { PluginInstallRecord } from "../config/types.plugins";
import { buildNpmResolutionFields, type NpmSpecResolution } from "../infra/install-source-utils";

export type PluginInstallUpdate = PluginInstallRecord & { pluginId: string };

export function buildNpmResolutionInstallFields(
  resolution?: NpmSpecResolution,
): Pick<
  PluginInstallRecord,
  "resolvedName" | "resolvedVersion" | "resolvedSpec" | "integrity" | "shasum" | "resolvedAt"
> {
  return buildNpmResolutionFields(resolution);
}

export function recordPluginInstall(
  cfg: PowerDirectorConfig,
  update: PluginInstallUpdate,
): PowerDirectorConfig {
  const { pluginId, ...record } = update;
  const installs = {
    ...cfg.plugins?.installs,
    [pluginId]: {
      ...cfg.plugins?.installs?.[pluginId],
      ...record,
      installedAt: record.installedAt ?? new Date().toISOString(),
    },
  };

  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      installs: {
        ...installs,
        [pluginId]: installs[pluginId],
      },
    },
  };
}
