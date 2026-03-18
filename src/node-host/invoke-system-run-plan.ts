/**
 * invoke-system-run-plan.ts
 *
 * Helpers for identifying the mutable file script operand in `bun` and
 * `deno run` argv, so exec-approval snapshot binding can cover these
 * runtimes in addition to the POSIX shell and node interpreters already
 * handled by the core allowlist path.
 *
 * Ported from upstream OpenClaw v2026.3.8 (commit cf3a479b).
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Bun subcommand / option tables
// ---------------------------------------------------------------------------

export const BUN_SUBCOMMANDS = new Set([
  "add",
  "audit",
  "completions",
  "create",
  "exec",
  "help",
  "init",
  "install",
  "link",
  "outdated",
  "patch",
  "pm",
  "publish",
  "remove",
  "repl",
  "run",
  "test",
  "unlink",
  "update",
  "upgrade",
  "x",
]);

/** Bun flags that consume the next argv token as their value. */
export const BUN_OPTIONS_WITH_VALUE = new Set([
  "--backend",
  "--bunfig",
  "--conditions",
  "--config",
  "--console-depth",
  "--cwd",
  "--define",
  "--elide-lines",
  "--env-file",
  "--extension-order",
  "--filter",
  "--inspect",
  "--inspect-brk",
  "--inspect-wait",
  "--install",
  "--jsx-factory",
  "--jsx-fragment",
  "--jsx-import-source",
  "--loader",
  "--origin",
  "--port",
  "--preload",
  "--tsconfig-override",
  "-c",
  "-e",
  "-p",
  "-r",
]);

/** `deno run` flags that consume the next argv token as their value. */
export const DENO_RUN_OPTIONS_WITH_VALUE = new Set([
  "--cached-only",
  "--cert",
  "--config",
  "--env-file",
  "--ext",
  "--harmony-import-attributes",
  "--import-map",
  "--inspect",
  "--inspect-brk",
  "--inspect-wait",
  "--location",
  "--log-level",
  "--lock",
  "--node-modules-dir",
  "--no-check",
  "--preload",
  "--reload",
  "--seed",
  "--strace-ops",
  "--unstable-bare-node-builtins",
  "--v8-flags",
  "--watch",
  "--watch-exclude",
  "-L",
]);

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a token looks like a file-system path token (i.e. it
 * contains path separators or has a file extension).  Used as a secondary
 * guard so bare words that match no subcommand are still only treated as a
 * mutable file operand when they look path-like.
 */
export function looksLikePathToken(token: string): boolean {
  return (
    token.startsWith(".") ||
    token.startsWith("/") ||
    token.startsWith("\\") ||
    token.includes("/") ||
    token.includes("\\") ||
    path.extname(token).length > 0
  );
}

/**
 * Checks (synchronously) whether `rawOperand` resolves to an existing file
 * on disk, relative to `cwd`.  Used to distinguish a script file argument
 * from a bun subcommand or a package name.
 */
export function resolvesToExistingFileSync(
  rawOperand: string,
  cwd: string | undefined,
): boolean {
  if (!rawOperand) {
    return false;
  }
  try {
    return fs.statSync(path.resolve(cwd ?? process.cwd(), rawOperand)).isFile();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Option-filtered index resolution
// ---------------------------------------------------------------------------

/**
 * Scans `argv` starting at `startIndex`, skipping flags (and their values
 * when listed in `optionsWithValue`), until the first positional token that
 * resolves to an existing file on disk.  Returns its index, or null.
 */
export function resolveOptionFilteredFileOperandIndex(params: {
  argv: string[];
  startIndex: number;
  cwd: string | undefined;
  optionsWithValue?: ReadonlySet<string>;
}): number | null {
  let afterDoubleDash = false;
  for (let i = params.startIndex; i < params.argv.length; i += 1) {
    const token = params.argv[i]?.trim() ?? "";
    if (!token) {
      continue;
    }
    if (afterDoubleDash) {
      return resolvesToExistingFileSync(token, params.cwd) ? i : null;
    }
    if (token === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (token === "-") {
      return null;
    }
    if (token.startsWith("-")) {
      if (!token.includes("=") && params.optionsWithValue?.has(token)) {
        i += 1;
      }
      continue;
    }
    return resolvesToExistingFileSync(token, params.cwd) ? i : null;
  }
  return null;
}

/**
 * Like {@link resolveOptionFilteredFileOperandIndex} but returns the first
 * positional token index without performing a file-existence check.  Used
 * to locate the bun subcommand / direct-file position in argv.
 */
export function resolveOptionFilteredPositionalIndex(params: {
  argv: string[];
  startIndex: number;
  optionsWithValue?: ReadonlySet<string>;
}): number | null {
  let afterDoubleDash = false;
  for (let i = params.startIndex; i < params.argv.length; i += 1) {
    const token = params.argv[i]?.trim() ?? "";
    if (!token) {
      continue;
    }
    if (afterDoubleDash) {
      return i;
    }
    if (token === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (token === "-") {
      return null;
    }
    if (token.startsWith("-")) {
      if (!token.includes("=") && params.optionsWithValue?.has(token)) {
        i += 1;
      }
      continue;
    }
    return i;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Runtime-specific scanners
// ---------------------------------------------------------------------------

/**
 * Returns the argv index of the mutable script file operand in a `bun`
 * invocation, or null when there is no such operand (e.g. `bun install`).
 *
 * Handles:
 *   - `bun ./run.ts`           → argv[1]
 *   - `bun run ./run.ts`       → argv[2] (after option scanning)
 *   - `bun --config x run ./f` → scans over options
 *   - `bun install`            → null (known subcommand, no file)
 */
export function resolveBunScriptOperandIndex(params: {
  argv: string[];
  cwd: string | undefined;
}): number | null {
  const directIndex = resolveOptionFilteredPositionalIndex({
    argv: params.argv,
    startIndex: 1,
    optionsWithValue: BUN_OPTIONS_WITH_VALUE,
  });
  if (directIndex === null) {
    return null;
  }
  const directToken = params.argv[directIndex]?.trim() ?? "";
  if (directToken === "run") {
    // `bun run <script>` — scan after the "run" subcommand
    return resolveOptionFilteredFileOperandIndex({
      argv: params.argv,
      startIndex: directIndex + 1,
      cwd: params.cwd,
      optionsWithValue: BUN_OPTIONS_WITH_VALUE,
    });
  }
  if (BUN_SUBCOMMANDS.has(directToken)) {
    // e.g. `bun install`, `bun test`, `bun add pkg` — no mutable file operand
    return null;
  }
  if (!looksLikePathToken(directToken)) {
    // Bare word that isn't a known subcommand and doesn't look like a path
    return null;
  }
  return directIndex;
}

/**
 * Returns the argv index of the mutable script file operand in a
 * `deno run <script>` invocation, or null when not applicable.
 *
 * Only handles `deno run` (not `deno compile`, `deno fmt`, etc.).
 */
export function resolveDenoRunScriptOperandIndex(params: {
  argv: string[];
  cwd: string | undefined;
}): number | null {
  if ((params.argv[1]?.trim() ?? "") !== "run") {
    return null;
  }
  return resolveOptionFilteredFileOperandIndex({
    argv: params.argv,
    startIndex: 2,
    cwd: params.cwd,
    optionsWithValue: DENO_RUN_OPTIONS_WITH_VALUE,
  });
}
