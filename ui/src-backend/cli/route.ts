import { isTruthyEnvValue } from '../infra/env';
import { defaultRuntime } from '../runtime';
import { VERSION } from '../version';
import { getCommandPath, hasHelpOrVersion } from './argv';
import { emitCliBanner } from './banner';
import { ensurePluginRegistryLoaded } from './plugin-registry';
import { ensureConfigReady } from './program/config-guard';
import { findRoutedCommand } from './program/routes';

async function prepareRoutedCommand(params: {
  argv: string[];
  commandPath: string[];
  loadPlugins?: boolean;
}) {
  emitCliBanner(VERSION, { argv: params.argv });
  await ensureConfigReady({ runtime: defaultRuntime, commandPath: params.commandPath });
  if (params.loadPlugins) {
    ensurePluginRegistryLoaded();
  }
}

export async function tryRouteCli(argv: string[]): Promise<boolean> {
  if (isTruthyEnvValue(process.env.POWERDIRECTOR_DISABLE_ROUTE_FIRST)) {
    return false;
  }
  if (hasHelpOrVersion(argv)) {
    return false;
  }

  const path = getCommandPath(argv, 2);
  if (!path[0]) {
    return false;
  }
  const route = findRoutedCommand(path);
  if (!route) {
    return false;
  }
  await prepareRoutedCommand({ argv, commandPath: path, loadPlugins: route.loadPlugins });
  return route.run(argv);
}
