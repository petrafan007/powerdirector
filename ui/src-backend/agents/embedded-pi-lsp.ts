import type { PowerDirectorConfig } from "../config/config";
import type { BundleLspServerConfig } from "../plugins/bundle-lsp";
import { loadEnabledBundleLspConfig } from "../plugins/bundle-lsp";

export type EmbeddedPiLspConfig = {
  lspServers: Record<string, BundleLspServerConfig>;
  diagnostics: Array<{ pluginId: string; message: string }>;
};

export function loadEmbeddedPiLspConfig(params: {
  workspaceDir: string;
  cfg?: PowerDirectorConfig;
}): EmbeddedPiLspConfig {
  const bundleLsp = loadEnabledBundleLspConfig({
    workspaceDir: params.workspaceDir,
    cfg: params.cfg,
  });
  // User-configured LSP servers could override bundle defaults here in the future.
  return {
    lspServers: { ...bundleLsp.config.lspServers },
    diagnostics: bundleLsp.diagnostics,
  };
}
