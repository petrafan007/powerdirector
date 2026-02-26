import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare const __POWERDIRECTOR_VERSION__: string | undefined;
const CORE_PACKAGE_NAME = "powerdirector";

const PACKAGE_JSON_CANDIDATES = ["package.json", "../package.json", "../../package.json"] as const;

const BUILD_INFO_CANDIDATES = ["build-info.json", "../build-info.json", "../../build-info.json"] as const;

function tryReadJson(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function uniqueDirs(moduleUrl: string): string[] {
  const dirs = new Set<string>();
  dirs.add(process.cwd());
  try {
    if (moduleUrl.startsWith("file:")) {
      dirs.add(path.dirname(fileURLToPath(moduleUrl)));
    }
  } catch {
    // ignore malformed module URLs
  }
  return Array.from(dirs);
}

function readVersionFromJsonCandidates(
  moduleUrl: string,
  candidates: readonly string[],
  opts: { requirePackageName?: boolean } = {},
): string | null {
  for (const baseDir of uniqueDirs(moduleUrl)) {
    for (const candidate of candidates) {
      const parsed = tryReadJson(path.resolve(baseDir, candidate));
      if (!parsed) {
        continue;
      }
      const versionValue = parsed.version;
      const version = typeof versionValue === "string" ? versionValue.trim() : "";
      if (!version) {
        continue;
      }
      if (opts.requirePackageName) {
        const name = typeof parsed.name === "string" ? parsed.name : "";
        if (name !== CORE_PACKAGE_NAME) {
          continue;
        }
      }
      return version;
    }
  }
  return null;
}

function readVersionFromNearestPackage(moduleUrl: string): string | null {
  const visited = new Set<string>();
  for (const startDir of uniqueDirs(moduleUrl)) {
    let current = path.resolve(startDir);
    while (!visited.has(current)) {
      visited.add(current);
      const parsed = tryReadJson(path.join(current, "package.json"));
      if (parsed) {
        const name = typeof parsed.name === "string" ? parsed.name : "";
        const versionValue = parsed.version;
        const version = typeof versionValue === "string" ? versionValue.trim() : "";
        if (name === CORE_PACKAGE_NAME && version) {
          return version;
        }
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }
  return null;
}

function normalizeVersionCandidate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  const lower = trimmed.toLowerCase();
  // Next/bundlers sometimes inject a placeholder version string.
  if (trimmed === "0.0.0" || trimmed === "v0.0.0" || lower === "dev") {
    return undefined;
  }
  return trimmed;
}

function firstNonPlaceholderVersion(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = normalizeVersionCandidate(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

export function readVersionFromPackageJsonForModuleUrl(moduleUrl: string): string | null {
  return readVersionFromJsonCandidates(moduleUrl, PACKAGE_JSON_CANDIDATES, {
    requirePackageName: true,
  });
}

export function readVersionFromBuildInfoForModuleUrl(moduleUrl: string): string | null {
  return readVersionFromJsonCandidates(moduleUrl, BUILD_INFO_CANDIDATES);
}

export function resolveVersionFromModuleUrl(moduleUrl: string): string | null {
  return (
    readVersionFromPackageJsonForModuleUrl(moduleUrl) ||
    readVersionFromNearestPackage(moduleUrl) ||
    readVersionFromBuildInfoForModuleUrl(moduleUrl)
  );
}

export type RuntimeVersionEnv = {
  [key: string]: string | undefined;
};

export function resolveRuntimeServiceVersion(
  env: RuntimeVersionEnv = process.env as RuntimeVersionEnv,
  fallback = "dev",
): string {
  return (
    firstNonPlaceholderVersion(
      env["POWERDIRECTOR_VERSION"],
      env["POWERDIRECTOR_SERVICE_VERSION"],
      env["POWERDIRECTOR_VERSION"],
      env["POWERDIRECTOR_SERVICE_VERSION"],
      env["npm_package_version"],
    ) ?? fallback
  );
}

// Single source of truth for the current PowerDirector version.
// - Embedded/bundled builds: injected define or env var.
// - Dev/npm builds: package.json.
export const VERSION =
  firstNonPlaceholderVersion(
    typeof __POWERDIRECTOR_VERSION__ === "string" ? __POWERDIRECTOR_VERSION__ : undefined,
    process.env.POWERDIRECTOR_BUNDLED_VERSION,
    process.env.POWERDIRECTOR_BUNDLED_VERSION,
    process.env.POWERDIRECTOR_VERSION,
    process.env.PD_VERSION,
  ) ||
  resolveVersionFromModuleUrl(import.meta.url) ||
  "0.0.0";
