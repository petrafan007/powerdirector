import { createSubsystemLogger } from '../logging/subsystem';
import { loadPowerDirectorPlugins, type PluginLoadOptions } from './loader';
import { createPluginLoaderLogger } from './logger';
import type { ProviderPlugin } from './types';

const log = createSubsystemLogger("plugins");

export function resolvePluginProviders(params: {
  config?: PluginLoadOptions["config"];
  workspaceDir?: string;
}): ProviderPlugin[] {
  const registry = loadPowerDirectorPlugins({
    config: params.config,
    workspaceDir: params.workspaceDir,
    logger: createPluginLoaderLogger(log),
  });

  return registry.providers.map((entry) => entry.provider);
}
