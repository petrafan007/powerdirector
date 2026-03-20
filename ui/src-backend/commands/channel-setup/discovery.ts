import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../../agents/agent-scope";
import {
  listChannelPluginCatalogEntries,
  type ChannelPluginCatalogEntry,
} from "../../channels/plugins/catalog";
import type { ChannelMeta, ChannelPlugin } from "../../channels/plugins/types";
import { listChatChannels } from "../../channels/registry";
import type { PowerDirectorConfig } from "../../config/config";
import { loadPluginManifestRegistry } from "../../plugins/manifest-registry";
import type { ChannelChoice } from "../onboard-types";

type ChannelCatalogEntry = {
  id: ChannelChoice;
  meta: ChannelMeta;
};

export type ResolvedChannelSetupEntries = {
  entries: ChannelCatalogEntry[];
  installedCatalogEntries: ChannelPluginCatalogEntry[];
  installableCatalogEntries: ChannelPluginCatalogEntry[];
  installedCatalogById: Map<ChannelChoice, ChannelPluginCatalogEntry>;
  installableCatalogById: Map<ChannelChoice, ChannelPluginCatalogEntry>;
};

function resolveWorkspaceDir(cfg: PowerDirectorConfig, workspaceDir?: string): string | undefined {
  return workspaceDir ?? resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
}

export function listManifestInstalledChannelIds(params: {
  cfg: PowerDirectorConfig;
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
}): Set<ChannelChoice> {
  const workspaceDir = resolveWorkspaceDir(params.cfg, params.workspaceDir);
  return new Set(
    loadPluginManifestRegistry({
      config: params.cfg,
      workspaceDir,
      env: params.env ?? process.env,
    }).plugins.flatMap((plugin) => plugin.channels as ChannelChoice[]),
  );
}

export function isCatalogChannelInstalled(params: {
  cfg: PowerDirectorConfig;
  entry: ChannelPluginCatalogEntry;
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
}): boolean {
  return listManifestInstalledChannelIds(params).has(params.entry.id as ChannelChoice);
}

export function resolveChannelSetupEntries(params: {
  cfg: PowerDirectorConfig;
  installedPlugins: ChannelPlugin[];
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
}): ResolvedChannelSetupEntries {
  const workspaceDir = resolveWorkspaceDir(params.cfg, params.workspaceDir);
  const manifestInstalledIds = listManifestInstalledChannelIds({
    cfg: params.cfg,
    workspaceDir,
    env: params.env,
  });
  const installedPluginIds = new Set(params.installedPlugins.map((plugin) => plugin.id));
  const catalogEntries = listChannelPluginCatalogEntries({ workspaceDir });
  const installedCatalogEntries = catalogEntries.filter(
    (entry) =>
      !installedPluginIds.has(entry.id) && manifestInstalledIds.has(entry.id as ChannelChoice),
  );
  const installableCatalogEntries = catalogEntries.filter(
    (entry) =>
      !installedPluginIds.has(entry.id) && !manifestInstalledIds.has(entry.id as ChannelChoice),
  );

  const metaById = new Map<string, ChannelMeta>();
  for (const meta of listChatChannels()) {
    metaById.set(meta.id, meta);
  }
  for (const plugin of params.installedPlugins) {
    metaById.set(plugin.id, plugin.meta);
  }
  for (const entry of installedCatalogEntries) {
    if (!metaById.has(entry.id)) {
      metaById.set(entry.id, entry.meta);
    }
  }
  for (const entry of installableCatalogEntries) {
    if (!metaById.has(entry.id)) {
      metaById.set(entry.id, entry.meta);
    }
  }

  return {
    entries: Array.from(metaById, ([id, meta]) => ({
      id: id as ChannelChoice,
      meta,
    })),
    installedCatalogEntries,
    installableCatalogEntries,
    installedCatalogById: new Map(
      installedCatalogEntries.map((entry) => [entry.id as ChannelChoice, entry]),
    ),
    installableCatalogById: new Map(
      installableCatalogEntries.map((entry) => [entry.id as ChannelChoice, entry]),
    ),
  };
}
