import type { PowerDirectorConfig } from "../config/config";
import { loadPowerDirectorPlugins } from "../plugins/loader";
import { resolveUserPath } from "../utils";

export function ensureRuntimePluginsLoaded(params: {
  config?: PowerDirectorConfig;
  workspaceDir?: string | null;
  allowGatewaySubagentBinding?: boolean;
}): void {
  const workspaceDir =
    typeof params.workspaceDir === "string" && params.workspaceDir.trim()
      ? resolveUserPath(params.workspaceDir)
      : undefined;

  loadPowerDirectorPlugins({
    config: params.config,
    workspaceDir,
    runtimeOptions: params.allowGatewaySubagentBinding
      ? {
          allowGatewaySubagentBinding: true,
        }
      : undefined,
  });
}
