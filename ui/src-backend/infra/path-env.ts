import fs from "node:fs";
import path from "node:path";
import { resolveBrewPathDirs } from "./brew";
import { isTruthyEnvValue } from "./env";
import { safeHomedir } from "./os-safe";

type EnsurePowerDirectorPathOpts = {
  execPath?: string;
  cwd?: string;
  homeDir?: string;
  platform?: NodeJS.Platform;
  pathEnv?: string;
  allowProjectLocalBin?: boolean;
};

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function mergePath(params: { existing: string; prepend?: string[]; append?: string[] }): string {
  const partsExisting = params.existing
    .split(path.delimiter)
    .map((part) => part.trim())
    .filter(Boolean);
  const partsPrepend = (params.prepend ?? []).map((part) => part.trim()).filter(Boolean);
  const partsAppend = (params.append ?? []).map((part) => part.trim()).filter(Boolean);

  const seen = new Set<string>();
  const merged: string[] = [];
  for (const part of [...partsPrepend, ...partsExisting, ...partsAppend]) {
    if (!seen.has(part)) {
      seen.add(part);
      merged.push(part);
    }
  }
  return merged.join(path.delimiter);
}

function candidateBinDirs(opts: EnsurePowerDirectorPathOpts): { prepend: string[]; append: string[] } {
  const execPath = opts.execPath ?? process.execPath;
  const cwd = opts.cwd ?? process.cwd();
  const homeDir = opts.homeDir ?? safeHomedir();
  const platform = opts.platform ?? process.platform;

  const prepend: string[] = [];
  const append: string[] = [];

  // Bundled macOS app: `powerdirector` lives next to the executable (process.execPath).
  try {
    const execDir = path.dirname(execPath);
    const siblingCli = path.join(execDir, "powerdirector");
    if (isExecutable(siblingCli)) {
      prepend.push(execDir);
    }
  } catch {
    // ignore
  }

  // Project-local installs are a common repo-based attack vector (bin hijacking). Keep this
  // disabled by default; if an operator explicitly enables it, only append (never prepend).
  const allowProjectLocalBin =
    opts.allowProjectLocalBin === true ||
    isTruthyEnvValue(process.env.POWERDIRECTOR_ALLOW_PROJECT_LOCAL_BIN);
  if (allowProjectLocalBin) {
    const localBinDir = path.join(cwd, "node_modules", ".bin");
    if (isExecutable(path.join(localBinDir, "powerdirector"))) {
      append.push(localBinDir);
    }
  }

  const miseDataDir = process.env.MISE_DATA_DIR ?? path.join(homeDir, ".local", "share", "mise");
  const miseShims = path.join(miseDataDir, "shims");
  if (isDirectory(miseShims)) {
    prepend.push(miseShims);
  }

  prepend.push(...resolveBrewPathDirs({ homeDir }));

  // Common global install locations (macOS first).
  if (platform === "darwin") {
    prepend.push(path.join(homeDir, "Library", "pnpm"));
  }
  if (process.env.XDG_BIN_HOME) {
    prepend.push(process.env.XDG_BIN_HOME);
  }
  prepend.push(path.join(homeDir, ".local", "bin"));
  prepend.push(path.join(homeDir, ".local", "share", "pnpm"));
  prepend.push(path.join(homeDir, ".bun", "bin"));
  prepend.push(path.join(homeDir, ".yarn", "bin"));
  prepend.push("/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin");

  return { prepend: prepend.filter(isDirectory), append: append.filter(isDirectory) };
}

/**
 * Best-effort PATH bootstrap so skills that require the `powerdirector` CLI can run
 * under launchd/minimal environments (and inside the macOS app bundle).
 */
export function ensurePowerDirectorCliOnPath(opts: EnsurePowerDirectorPathOpts = {}) {
  if (isTruthyEnvValue(process.env.POWERDIRECTOR_PATH_BOOTSTRAPPED)) {
    return;
  }
  process.env.POWERDIRECTOR_PATH_BOOTSTRAPPED = "1";

  const existing = opts.pathEnv ?? process.env.PATH ?? "";
  const { prepend, append } = candidateBinDirs(opts);
  if (prepend.length === 0 && append.length === 0) {
    return;
  }

  const merged = mergePath({ existing, prepend, append });
  if (merged) {
    process.env.PATH = merged;
  }
}
