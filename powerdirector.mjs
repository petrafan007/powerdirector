#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// https://nodejs.org/api/module.html#module-compile-cache
if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore errors
  }
}

const isModuleNotFoundError = (err) =>
  err && typeof err === "object" && "code" in err && err.code === "ERR_MODULE_NOT_FOUND";

const installProcessWarningFilter = async () => {
  // Keep bootstrap warnings consistent with the TypeScript runtime.
  for (const specifier of ["./dist/warning-filter.js", "./dist/warning-filter.mjs"]) {
    try {
      const mod = await import(specifier);
      if (typeof mod.installProcessWarningFilter === "function") {
        mod.installProcessWarningFilter();
        return;
      }
    } catch (err) {
      if (isModuleNotFoundError(err)) {
        continue;
      }
      throw err;
    }
  }
};

await installProcessWarningFilter();

const tryImport = async (specifier) => {
  try {
    await import(specifier);
    return { ok: true };
  } catch (err) {
    if (isModuleNotFoundError(err)) {
      return { ok: false, missing: true };
    }
    return { ok: false, missing: false, error: err };
  }
};

const entrySpecifiers = [
  "./dist/src/entry.js",
  "./dist/src/entry.mjs",
  "./dist/entry.js",
  "./dist/entry.mjs",
];

let loaded = false;
const importErrors = [];
for (const specifier of entrySpecifiers) {
  const result = await tryImport(specifier);
  if (result.ok) {
    loaded = true;
    break;
  }
  if (!result.missing && result.error) {
    importErrors.push({ specifier, error: result.error });
  }
}

if (!loaded) {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const tsEntry = path.join(rootDir, "src", "entry.ts");
  if (fs.existsSync(tsEntry)) {
    // Local source checkout fallback: run the TypeScript entry through tsx.
    const fallback = spawnSync(
      process.execPath,
      ["--import", "tsx", tsEntry, ...process.argv.slice(2)],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          POWERDIRECTOR_CLI_NAME: path.basename(process.argv[1] ?? ""),
        },
        stdio: "inherit",
      },
    );
    if (typeof fallback.status === "number") {
      process.exit(fallback.status);
    }
    if (fallback.error) {
      throw fallback.error;
    }
  }

  if (importErrors.length > 0) {
    const details = importErrors
      .map((entry) => `${entry.specifier}: ${String(entry.error)}`)
      .join(" | ");
    throw new Error(`powerdirector: failed to load compiled entry (${details})`);
  }

  throw new Error("powerdirector: missing dist/src/entry.(m)js or dist/entry.(m)js (build output).");
}
