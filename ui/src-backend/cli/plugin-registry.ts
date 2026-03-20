import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope";
import { loadConfig } from "../config/config";
import { createSubsystemLogger } from "../logging";
import {
  resolveChannelPluginIds,
  resolveConfiguredChannelPluginIds,
} from "../plugins/channel-plugin-ids";
import { loadPowerDirectorPlugins } from "../plugins/loader";
import { getActivePluginRegistry } from "../plugins/runtime";
import type { PluginLogger } from "../plugins/types";

const log = createSubsystemLogger("plugins");
let pluginRegistryLoaded: "none" | "configured-channels" | "channels" | "all" = "none";

export type PluginRegistryScope = "configured-channels" | "channels" | "all";

function scopeRank(scope: typeof pluginRegistryLoaded): number {
  switch (scope) {
    case "none":
      return 0;
    case "configured-channels":
      return 1;
    case "channels":
      return 2;
    case "all":
      return 3;
  }
}

export function ensurePluginRegistryLoaded(options?: { scope?: PluginRegistryScope }): void {
  const scope = options?.scope ?? "all";
  if (scopeRank(pluginRegistryLoaded) >= scopeRank(scope)) {
    return;
  }
  const active = getActivePluginRegistry();
  // Tests (and callers) can pre-seed a registry (e.g. `test/setup.ts`); avoid
  // doing an expensive load when we already have plugins/channels/tools.
  if (
    pluginRegistryLoaded === "none" &&
    active &&
    (active.plugins.length > 0 || active.channels.length > 0 || active.tools.length > 0)
  ) {
    pluginRegistryLoaded = "all";
    return;
  }
  const config = loadConfig();
  const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
  const logger: PluginLogger = {
    info: (msg) => log.info(msg),
    warn: (msg) => log.warn(msg),
    error: (msg) => log.error(msg),
    debug: (msg) => log.debug(msg),
  };
  loadPowerDirectorPlugins({
    config,
    workspaceDir,
    logger,
    ...(scope === "configured-channels"
      ? {
          onlyPluginIds: resolveConfiguredChannelPluginIds({
            config,
            workspaceDir,
            env: process.env,
          }),
        }
      : scope === "channels"
        ? {
            onlyPluginIds: resolveChannelPluginIds({
              config,
              workspaceDir,
              env: process.env,
            }),
          }
        : {}),
  });
  pluginRegistryLoaded = scope;
}
