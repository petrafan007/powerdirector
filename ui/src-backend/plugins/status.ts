import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from '../agents/agent-scope';
import { resolveDefaultAgentWorkspaceDir } from '../agents/workspace';
import { loadConfig } from '../config/config';
import { createSubsystemLogger } from '../logging/subsystem';
import { loadPowerDirectorPlugins } from './loader';
import { createPluginLoaderLogger } from './logger';
import type { PluginRegistry } from './registry';

export type PluginStatusReport = PluginRegistry & {
  workspaceDir?: string;
};

const log = createSubsystemLogger("plugins");

export function buildPluginStatusReport(params?: {
  config?: ReturnType<typeof loadConfig>;
  workspaceDir?: string;
}): PluginStatusReport {
  const config = params?.config ?? loadConfig();
  const workspaceDir = params?.workspaceDir
    ? params.workspaceDir
    : (resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config)) ??
      resolveDefaultAgentWorkspaceDir());

  const registry = loadPowerDirectorPlugins({
    config,
    workspaceDir,
    logger: createPluginLoaderLogger(log),
  });

  return {
    workspaceDir,
    ...registry,
  };
}
