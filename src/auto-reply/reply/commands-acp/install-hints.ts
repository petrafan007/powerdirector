import { existsSync } from "node:fs";
import path from "node:path";
import type { PowerDirectorConfig } from "../../../config/config.js";

export function resolveConfiguredAcpBackendId(cfg: PowerDirectorConfig): string {
  return cfg.acp?.backend?.trim() || "acpx";
}

export function resolveAcpInstallCommandHint(cfg: PowerDirectorConfig): string {
  const configured = cfg.acp?.runtime?.installCommand?.trim();
  if (configured) {
    return configured;
  }
  const backendId = resolveConfiguredAcpBackendId(cfg).toLowerCase();
  if (backendId === "acpx") {
    const localPath = path.resolve(process.cwd(), "extensions/acpx");
    if (existsSync(localPath)) {
      return `powerdirector plugins install ${localPath}`;
    }
    return "powerdirector plugins install acpx";
  }
  return `Install and enable the plugin that provides ACP backend "${backendId}".`;
}
