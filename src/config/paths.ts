import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expandHomePrefix, resolveRequiredHomeDir } from "../infra/home-dir.js";
import type { PowerDirectorConfig } from "./types.js";

/**
 * Nix mode detection: When POWERDIRECTOR_NIX_MODE=1, the gateway is running under Nix.
 * In this mode:
 * - No auto-install flows should be attempted
 * - Missing dependencies should be fatal errors
 * - Config is expected to be immutable/managed by Nix
 */
export function resolveIsNixMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.POWERDIRECTOR_NIX_MODE === "1";
}

export const isNixMode = resolveIsNixMode();

const LEGACY_STATE_DIRNAMES = [".clawdbot", ".moldbot", ".moltbot"] as const;
const NEW_STATE_DIRNAME = ".powerdirector";
const CONFIG_FILENAME = "powerdirector.config.json";
const LEGACY_CONFIG_FILENAMES = ["powerdirector.json", "clawdbot.json", "moldbot.json", "moltbot.json"] as const;

function resolveDefaultHomeDir(): string {
  return resolveRequiredHomeDir(process.env, () => os.homedir());
}

/** Build a homedir thunk that respects POWERDIRECTOR_HOME for the given env. */
function buildHomeDirResolver(env: NodeJS.ProcessEnv = process.env): () => string {
  const custom = env.POWERDIRECTOR_HOME?.trim();
  if (custom) {
    const resolved = expandHomePrefix(custom, os.homedir);
    return () => resolved;
  }
  return resolveDefaultHomeDir;
}

export function resolveLegacyStateDir(homedir: () => string = resolveDefaultHomeDir): string {
  return path.join(homedir(), ".powerdirector");
}

export function resolveLegacyStateDirs(homedir: () => string = resolveDefaultHomeDir): string[] {
  return LEGACY_STATE_DIRNAMES.map((dir) => path.join(homedir(), dir));
}

export function resolveNewStateDir(homedir: () => string = resolveDefaultHomeDir): string {
  return path.join(homedir(), NEW_STATE_DIRNAME);
}

export function resolveStateDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = buildHomeDirResolver(env),
): string {
  const envDir = env.POWERDIRECTOR_STATE_DIR?.trim();
  if (envDir) {
    return expandHomePrefix(envDir, homedir);
  }
  return resolveNewStateDir(homedir);
}

export const STATE_DIR = resolveStateDir();

export function resolvePowerDirectorRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(current, "package.json"), "utf8"));
        if (pkg.name === "powerdirector") {
          return current;
        }
      } catch {
        // ignore parse errors
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(startDir);
}

export function resolveCanonicalConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = buildHomeDirResolver(env),
): string {
  const stateDir = resolveStateDir(env, homedir);
  return path.join(stateDir, CONFIG_FILENAME);
}

export function resolveConfigPathCandidate(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = buildHomeDirResolver(env),
): string {
  const override = env.POWERDIRECTOR_CONFIG_PATH?.trim() || env.POWERDIRECTOR_CONFIG_PATH?.trim();
  if (override) {
    return expandHomePrefix(override, homedir);
  }

  const stateDir = resolveStateDir(env, homedir);
  const newStatePath = path.join(stateDir, CONFIG_FILENAME);
  if (fs.existsSync(newStatePath)) {
    return newStatePath;
  }

  const legacyDirs = resolveLegacyStateDirs(homedir);
  for (const dir of legacyDirs) {
    const p = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(p)) {
      return p;
    }
  }

  const candidates: string[] = [];
  const projectRoot = resolvePowerDirectorRoot();
  if (projectRoot) {
    candidates.push(path.join(projectRoot, CONFIG_FILENAME));
    candidates.push(...LEGACY_CONFIG_FILENAMES.map((name) => path.join(projectRoot, name)));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return newStatePath;
}

export function resolveConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = buildHomeDirResolver(env),
): string {
  return resolveConfigPathCandidate(env, homedir);
}

export const CONFIG_PATH = resolveConfigPathCandidate();

export function resolveDefaultConfigCandidates(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = buildHomeDirResolver(env),
): string[] {
  const candidates: string[] = [resolveCanonicalConfigPath(env, homedir)];
  const projectRoot = resolvePowerDirectorRoot();
  if (projectRoot) {
    candidates.push(path.join(projectRoot, CONFIG_FILENAME));
  }
  return Array.from(new Set(candidates));
}

export const DEFAULT_GATEWAY_PORT = 3012;

export function resolveGatewayLockDir(tmpdir: () => string = os.tmpdir): string {
  return path.join(tmpdir(), "powerdirector-gateway-lock");
}

export function resolveOAuthDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = buildHomeDirResolver(env),
): string {
  const stateDir = resolveStateDir(env, homedir);
  return path.join(stateDir, "credentials");
}

export function resolveOAuthPath(
  provider: string,
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = buildHomeDirResolver(env),
): string {
  const dir = resolveOAuthDir(env, homedir);
  return path.join(dir, `${provider}.json`);
}

export function resolveGatewayPort(cfg?: PowerDirectorConfig, env: NodeJS.ProcessEnv = process.env): number {
  const envPort = env.POWERDIRECTOR_GATEWAY_PORT?.trim();
  if (envPort) {
    const parsed = Number.parseInt(envPort, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const configPort = cfg?.gateway?.port;
  if (typeof configPort === "number" && Number.isFinite(configPort)) {
    if (configPort > 0) {
      return configPort;
    }
  }
  return DEFAULT_GATEWAY_PORT;
}
