import type { PowerDirectorConfig } from "../config/config.js";
import { loadPowerDirectorPlugins } from "../plugins/loader.js";
import { resolveUserPath } from "../utils.js";

export function ensureRuntimePluginsLoaded(params: {
  config?: PowerDirectorConfig;
  workspaceDir?: string | null;
}): void {
  const workspaceDir =
    typeof params.workspaceDir === "string" && params.workspaceDir.trim()
      ? resolveUserPath(params.workspaceDir)
      : undefined;

  loadPowerDirectorPlugins({
    config: params.config,
    workspaceDir,
  });
}
