import crypto from "node:crypto";
import path from "node:path";
import { resolveRequiredHomeDir } from "../infra/home-dir.js";
import { safeHomedir } from "../infra/os-safe.js";
import { resolveStateDir } from "./paths.js";

function envHomedir(env: NodeJS.ProcessEnv): () => string {
  return () => resolveRequiredHomeDir(env, safeHomedir);
}

function sanitizePathComponent(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "_");
}

function resolveConfigArtifactNamespace(configPath: string): string {
  const absolutePath = path.resolve(configPath);
  const filename = sanitizePathComponent(path.basename(absolutePath));
  const digest = crypto.createHash("sha1").update(absolutePath).digest("hex").slice(0, 12);
  return `${filename}-${digest}`;
}

export function resolveConfigArtifactsDir(
  configPath: string,
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = envHomedir(env),
): string {
  return path.join(
    resolveStateDir(env, homedir),
    "config-artifacts",
    resolveConfigArtifactNamespace(configPath),
  );
}

export function resolveConfigBackupBasePath(
  configPath: string,
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = envHomedir(env),
): string {
  const filename = sanitizePathComponent(path.basename(path.resolve(configPath)));
  return path.join(resolveConfigArtifactsDir(configPath, env, homedir), "backups", `${filename}.bak`);
}

export function resolveConfigTempPath(
  configPath: string,
  uniqueSuffix: string,
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = envHomedir(env),
): string {
  const filename = sanitizePathComponent(path.basename(path.resolve(configPath)));
  return path.join(
    resolveConfigArtifactsDir(configPath, env, homedir),
    "tmp",
    `${filename}.${uniqueSuffix}.tmp`,
  );
}
