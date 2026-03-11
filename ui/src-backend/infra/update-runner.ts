import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { type CommandOptions, runCommandWithTimeout } from '../process/exec';
import {
  resolveControlUiDistIndexHealth,
  resolveControlUiDistIndexPathForRoot,
} from './control-ui-assets';
import { detectPackageManager as detectPackageManagerImpl } from './detect-package-manager';
import { readPackageName, readPackageVersion } from './package-json';
import { trimLogTail } from './restart-sentinel';
import {
  channelToNpmTag,
  DEFAULT_PACKAGE_CHANNEL,
  DEV_BRANCH,
  type UpdateChannel,
} from './update-channels';
import { compareSemverStrings } from './update-check';
import {
  cleanupGlobalRenameDirs,
  detectGlobalInstallManagerForRoot,
  globalInstallArgs,
} from './update-global';
import {
  buildGitDirtyCheckArgv,
  createGitRuntimeBackup,
  filterBlockingGitDirtyStatus,
  GIT_SAFE_TEMP_ROOT_DIR_NAMES,
  GIT_SAFE_TEMP_ROOT_DIR_PREFIXES,
  isSafeGitTempRootDirPath,
  restorePreservedGitRuntimeFiles,
  snapshotPreservedGitRuntimeFiles,
  type GitRuntimeBackup,
} from './update-git-runtime-files';
import { resolveGitChannelTag } from './update-git-channel';

export type UpdateStepResult = {
  name: string;
  command: string;
  cwd: string;
  durationMs: number;
  exitCode: number | null;
  stdoutTail?: string | null;
  stderrTail?: string | null;
};

export type UpdateRunResult = {
  status: "ok" | "error" | "skipped";
  mode: "git" | "pnpm" | "bun" | "npm" | "unknown";
  root?: string;
  reason?: string;
  before?: { sha?: string | null; version?: string | null };
  after?: { sha?: string | null; version?: string | null };
  backup?: GitRuntimeBackup;
  steps: UpdateStepResult[];
  durationMs: number;
};

type CommandRunner = (
  argv: string[],
  options: CommandOptions,
) => Promise<{ stdout: string; stderr: string; code: number | null }>;

export type UpdateStepInfo = {
  name: string;
  command: string;
  index: number;
  total: number;
};

export type UpdateStepCompletion = UpdateStepInfo & {
  durationMs: number;
  exitCode: number | null;
  stderrTail?: string | null;
};

export type UpdateStepProgress = {
  onStepStart?: (step: UpdateStepInfo) => void;
  onStepComplete?: (step: UpdateStepCompletion) => void;
};

type UpdateRunnerOptions = {
  cwd?: string;
  argv1?: string;
  tag?: string;
  channel?: UpdateChannel;
  timeoutMs?: number;
  runCommand?: CommandRunner;
  progress?: UpdateStepProgress;
};

const DEFAULT_TIMEOUT_MS = 20 * 60_000;
const MAX_LOG_CHARS = 8000;
const PREFLIGHT_MAX_COMMITS = 10;
const START_DIRS = ["cwd", "argv1", "process"];
const DEFAULT_PACKAGE_NAME = "powerdirector";
const CORE_PACKAGE_NAMES = new Set([DEFAULT_PACKAGE_NAME]);

function createUpdateCommandEnv(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...(overrides ?? {}),
  };
  // Next.js sets TURBOPACK=auto in the server runtime; strip it so `next build --webpack`
  // inside updater jobs does not inherit conflicting bundler flags.
  env.TURBOPACK = undefined;
  return env;
}

function normalizeDir(value?: string | null) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return path.resolve(trimmed);
}

function resolveNodeModulesBinPackageRoot(argv1: string): string | null {
  const normalized = path.resolve(argv1);
  const parts = normalized.split(path.sep);
  const binIndex = parts.lastIndexOf(".bin");
  if (binIndex <= 0) {
    return null;
  }
  if (parts[binIndex - 1] !== "node_modules") {
    return null;
  }
  const binName = path.basename(normalized);
  const nodeModulesDir = parts.slice(0, binIndex).join(path.sep);
  return path.join(nodeModulesDir, binName);
}

function buildStartDirs(opts: UpdateRunnerOptions): string[] {
  const dirs: string[] = [];
  const cwd = normalizeDir(opts.cwd);
  if (cwd) {
    dirs.push(cwd);
  }
  const argv1 = normalizeDir(opts.argv1);
  if (argv1) {
    dirs.push(path.dirname(argv1));
    const packageRoot = resolveNodeModulesBinPackageRoot(argv1);
    if (packageRoot) {
      dirs.push(packageRoot);
    }
  }
  const proc = normalizeDir(process.cwd());
  if (proc) {
    dirs.push(proc);
  }
  return Array.from(new Set(dirs));
}

async function readBranchName(
  runCommand: CommandRunner,
  root: string,
  timeoutMs: number,
): Promise<string | null> {
  const res = await runCommand(["git", "-C", root, "rev-parse", "--abbrev-ref", "HEAD"], {
    timeoutMs,
  }).catch(() => null);
  if (!res || res.code !== 0) {
    return null;
  }
  const branch = res.stdout.trim();
  return branch || null;
}

async function resolveGitRoot(
  runCommand: CommandRunner,
  candidates: string[],
  timeoutMs: number,
): Promise<string | null> {
  for (const dir of candidates) {
    const res = await runCommand(["git", "-C", dir, "rev-parse", "--show-toplevel"], {
      timeoutMs,
    });
    if (res.code === 0) {
      const root = res.stdout.trim();
      if (root) {
        return root;
      }
    }
  }
  return null;
}

async function findPackageRoot(candidates: string[]) {
  for (const dir of candidates) {
    let current = dir;
    for (let i = 0; i < 12; i += 1) {
      const pkgPath = path.join(current, "package.json");
      try {
        const raw = await fs.readFile(pkgPath, "utf-8");
        const parsed = JSON.parse(raw) as { name?: string };
        const name = parsed?.name?.trim();
        if (name && CORE_PACKAGE_NAMES.has(name)) {
          return current;
        }
      } catch {
        // ignore
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

async function detectPackageManager(root: string) {
  return (await detectPackageManagerImpl(root)) ?? "npm";
}

type RunStepOptions = {
  runCommand: CommandRunner;
  name: string;
  argv: string[];
  cwd: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  progress?: UpdateStepProgress;
  stepIndex: number;
  totalSteps: number;
};

async function runStep(opts: RunStepOptions): Promise<UpdateStepResult> {
  const { runCommand, name, argv, cwd, timeoutMs, env, progress, stepIndex, totalSteps } = opts;
  const command = argv.join(" ");

  const stepInfo: UpdateStepInfo = {
    name,
    command,
    index: stepIndex,
    total: totalSteps,
  };

  progress?.onStepStart?.(stepInfo);

  const started = Date.now();
  const result = await runCommand(argv, {
    cwd,
    timeoutMs,
    env: createUpdateCommandEnv(env),
  });
  const durationMs = Date.now() - started;

  const stderrTail = trimLogTail(result.stderr, MAX_LOG_CHARS);

  progress?.onStepComplete?.({
    ...stepInfo,
    durationMs,
    exitCode: result.code,
    stderrTail,
  });

  return {
    name,
    command,
    cwd,
    durationMs,
    exitCode: result.code,
    stdoutTail: trimLogTail(result.stdout, MAX_LOG_CHARS),
    stderrTail: trimLogTail(result.stderr, MAX_LOG_CHARS),
  };
}

type InlineStepOptions<T> = {
  name: string;
  command: string;
  cwd: string;
  progress?: UpdateStepProgress;
  stepIndex: number;
  totalSteps: number;
  work: () => Promise<T>;
};

async function runInlineStep<T>(
  opts: InlineStepOptions<T>,
): Promise<{ step: UpdateStepResult; value?: T; error?: unknown }> {
  const { name, command, cwd, progress, stepIndex, totalSteps, work } = opts;
  const stepInfo: UpdateStepInfo = {
    name,
    command,
    index: stepIndex,
    total: totalSteps,
  };

  progress?.onStepStart?.(stepInfo);

  const started = Date.now();
  try {
    const value = await work();
    const durationMs = Date.now() - started;
    progress?.onStepComplete?.({
      ...stepInfo,
      durationMs,
      exitCode: 0,
    });
    return {
      value,
      step: {
        name,
        command,
        cwd,
        durationMs,
        exitCode: 0,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - started;
    const stderrTail = trimLogTail(error instanceof Error ? error.message : String(error), MAX_LOG_CHARS);
    progress?.onStepComplete?.({
      ...stepInfo,
      durationMs,
      exitCode: 1,
      stderrTail,
    });
    return {
      error,
      step: {
        name,
        command,
        cwd,
        durationMs,
        exitCode: 1,
        stderrTail,
      },
    };
  }
}

function managerScriptArgs(manager: "pnpm" | "bun" | "npm", script: string, args: string[] = []) {
  if (manager === "pnpm") {
    return ["pnpm", script, ...args];
  }
  if (manager === "bun") {
    return ["bun", "run", script, ...args];
  }
  if (args.length > 0) {
    return ["npm", "run", script, "--", ...args];
  }
  return ["npm", "run", script];
}

function managerInstallArgs(manager: "pnpm" | "bun" | "npm") {
  if (manager === "pnpm") {
    return ["pnpm", "install"];
  }
  if (manager === "bun") {
    return ["bun", "install"];
  }
  return ["npm", "install"];
}

function normalizeTag(tag?: string) {
  const trimmed = tag?.trim();
  if (!trimmed) {
    return "latest";
  }
  if (trimmed.startsWith("powerdirector@")) {
    return trimmed.slice("powerdirector@".length);
  }
  if (trimmed.startsWith(`${DEFAULT_PACKAGE_NAME}@`)) {
    return trimmed.slice(`${DEFAULT_PACKAGE_NAME}@`.length);
  }
  return trimmed;
}

function shouldConsiderSafeTempRootDir(name: string): boolean {
  if (GIT_SAFE_TEMP_ROOT_DIR_NAMES.includes(name as (typeof GIT_SAFE_TEMP_ROOT_DIR_NAMES)[number])) {
    return true;
  }
  return GIT_SAFE_TEMP_ROOT_DIR_PREFIXES.some((prefix) => name.startsWith(prefix));
}

async function cleanupGitSafeTempRootDirs(
  root: string,
  runCommand: CommandRunner,
  timeoutMs: number,
): Promise<{ removed: string[]; skipped: string[] }> {
  const removed: string[] = [];
  const skipped: string[] = [];
  let entries: Dirent[] = [];

  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return { removed, skipped };
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !shouldConsiderSafeTempRootDir(entry.name)) {
      continue;
    }

    const relativePath = `${entry.name}/`;
    if (!isSafeGitTempRootDirPath(relativePath)) {
      continue;
    }

    const trackedCheck = await runCommand(
      ["git", "-C", root, "ls-files", "--others", "--exclude-standard", "--directory", "--no-empty-directory", "--", entry.name],
      { cwd: root, timeoutMs },
    );
    const listedUntracked = trackedCheck.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!listedUntracked.some((line) => isSafeGitTempRootDirPath(line))) {
      skipped.push(relativePath);
      continue;
    }

    await fs.rm(path.join(root, entry.name), { recursive: true, force: true });
    removed.push(relativePath);
  }

  return { removed, skipped };
}

export async function runGatewayUpdate(opts: UpdateRunnerOptions = {}): Promise<UpdateRunResult> {
  const startedAt = Date.now();
  const runCommand =
    opts.runCommand ??
    (async (argv, options) => {
      const res = await runCommandWithTimeout(argv, options);
      return { stdout: res.stdout, stderr: res.stderr, code: res.code };
    });
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const progress = opts.progress;
  const steps: UpdateStepResult[] = [];
  const candidates = buildStartDirs(opts);

  let stepIndex = 0;
  let gitTotalSteps = 0;

  const step = (
    name: string,
    argv: string[],
    cwd: string,
    env?: NodeJS.ProcessEnv,
  ): RunStepOptions => {
    const currentIndex = stepIndex;
    stepIndex += 1;
    return {
      runCommand,
      name,
      argv,
      cwd,
      timeoutMs,
      env,
      progress,
      stepIndex: currentIndex,
      totalSteps: gitTotalSteps,
    };
  };
  const inlineStep = <T>(name: string, command: string, cwd: string, work: () => Promise<T>) => {
    const currentIndex = stepIndex;
    stepIndex += 1;
    return runInlineStep({
      name,
      command,
      cwd,
      work,
      progress,
      stepIndex: currentIndex,
      totalSteps: gitTotalSteps,
    });
  };

  const pkgRoot = await findPackageRoot(candidates);

  let gitRoot = await resolveGitRoot(runCommand, candidates, timeoutMs);
  if (gitRoot && pkgRoot && path.resolve(gitRoot) !== path.resolve(pkgRoot)) {
    gitRoot = null;
  }

  if (gitRoot && !pkgRoot) {
    return {
      status: "error",
      mode: "unknown",
      root: gitRoot,
      reason: "not-powerdirector-root",
      steps: [],
      durationMs: Date.now() - startedAt,
    };
  }

  if (gitRoot && pkgRoot && path.resolve(gitRoot) === path.resolve(pkgRoot)) {
    // Get current SHA (not a visible step, no progress)
    const beforeShaResult = await runCommand(["git", "-C", gitRoot, "rev-parse", "HEAD"], {
      cwd: gitRoot,
      timeoutMs,
    });
    const beforeSha = beforeShaResult.stdout.trim() || null;
    const beforeVersion = await readPackageVersion(gitRoot);
    const preservedRuntimeFiles = await snapshotPreservedGitRuntimeFiles(gitRoot);
    let runtimeBackup: GitRuntimeBackup | null = null;
    const channel: UpdateChannel = opts.channel ?? "dev";
    const branch = channel === "dev" ? await readBranchName(runCommand, gitRoot, timeoutMs) : null;
    const needsCheckoutMain = channel === "dev" && branch !== DEV_BRANCH;
    const resetRuntimeFilesStepCount = preservedRuntimeFiles.length > 0 ? 1 : 0;
    gitTotalSteps =
      (channel === "dev" ? (needsCheckoutMain ? 11 : 10) : 9) + resetRuntimeFilesStepCount + 2;
    const attachGitRuntimeBackup = (result: UpdateRunResult): UpdateRunResult =>
      runtimeBackup ? { ...result, backup: runtimeBackup } : result;
    const buildGitErrorResult = (reason: string): UpdateRunResult => ({
      status: "error",
      mode: "git",
      root: gitRoot,
      reason,
      before: { sha: beforeSha, version: beforeVersion },
      steps,
      durationMs: Date.now() - startedAt,
    });
    const finalizeGitResult = async (result: UpdateRunResult): Promise<UpdateRunResult> => {
      const nextResult = attachGitRuntimeBackup(result);
      if (preservedRuntimeFiles.length === 0) {
        return nextResult;
      }

      try {
        await restorePreservedGitRuntimeFiles(preservedRuntimeFiles);
      } catch (error) {
        return {
          ...nextResult,
          status: "error",
          reason: "restore-runtime-files-failed",
          steps: [
            ...nextResult.steps,
            {
              name: "restore runtime files",
              command: `restore ${preservedRuntimeFiles.map((file) => file.relativePath).join(" ")}`,
              cwd: gitRoot,
              durationMs: 0,
              exitCode: 1,
              stderrTail: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }

      return nextResult;
    };
    const runGitCheckoutOrFail = async (name: string, argv: string[]) => {
      const checkoutStep = await runStep(step(name, argv, gitRoot));
      steps.push(checkoutStep);
      if (checkoutStep.exitCode !== 0) {
        return finalizeGitResult(buildGitErrorResult("checkout-failed"));
      }
      return null;
    };

    const cleanupTempStep = await inlineStep(
      "cleanup safe temp artifacts",
      "cleanup safe temp artifacts",
      gitRoot,
      async () => cleanupGitSafeTempRootDirs(gitRoot, runCommand, timeoutMs),
    );
    steps.push(cleanupTempStep.step);
    if (cleanupTempStep.error) {
      return finalizeGitResult(buildGitErrorResult("cleanup-safe-temp-failed"));
    }

    const statusCheck = await runStep(
      step(
        "clean check",
        buildGitDirtyCheckArgv(gitRoot),
        gitRoot,
      ),
    );
    steps.push(statusCheck);
    const hasUncommittedChanges = filterBlockingGitDirtyStatus(statusCheck.stdoutTail ?? "").length > 0;
    if (hasUncommittedChanges) {
      return finalizeGitResult({
        status: "skipped",
        mode: "git",
        root: gitRoot,
        reason: "dirty",
        before: { sha: beforeSha, version: beforeVersion },
        steps,
        durationMs: Date.now() - startedAt,
      });
    }

    const backupStep = await inlineStep(
      "backup runtime files",
      "backup runtime files",
      gitRoot,
      async () => createGitRuntimeBackup(gitRoot),
    );
    steps.push(backupStep.step);
    if (backupStep.step.exitCode !== 0 || !backupStep.value) {
      return finalizeGitResult(buildGitErrorResult("backup-runtime-files-failed"));
    }
    runtimeBackup = backupStep.value;

    if (preservedRuntimeFiles.length > 0) {
      const resetRuntimeFilesStep = await runStep(
        step(
          "reset runtime files",
          ["git", "-C", gitRoot, "checkout", "--", ...preservedRuntimeFiles.map((file) => file.relativePath)],
          gitRoot,
        ),
      );
      steps.push(resetRuntimeFilesStep);
      if (resetRuntimeFilesStep.exitCode !== 0) {
        return finalizeGitResult(buildGitErrorResult("reset-runtime-files-failed"));
      }
    }

    if (channel === "dev") {
      if (needsCheckoutMain) {
        const failure = await runGitCheckoutOrFail(`git checkout ${DEV_BRANCH}`, [
          "git",
          "-C",
          gitRoot,
          "checkout",
          DEV_BRANCH,
        ]);
        if (failure) {
          return failure;
        }
      }

      const upstreamStep = await runStep(
        step(
          "upstream check",
          [
            "git",
            "-C",
            gitRoot,
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            "@{upstream}",
          ],
          gitRoot,
        ),
      );
      steps.push(upstreamStep);
      if (upstreamStep.exitCode !== 0) {
        return finalizeGitResult({
          status: "skipped",
          mode: "git",
          root: gitRoot,
          reason: "no-upstream",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const fetchStep = await runStep(
        step(
          "git fetch",
          ["git", "-C", gitRoot, "fetch", "--all", "--prune", "--tags", "--force"],
          gitRoot,
        ),
      );
      steps.push(fetchStep);
      if (fetchStep.exitCode !== 0) {
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "fetch-failed",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const upstreamShaStep = await runStep(
        step(
          "git rev-parse @{upstream}",
          ["git", "-C", gitRoot, "rev-parse", "@{upstream}"],
          gitRoot,
        ),
      );
      steps.push(upstreamShaStep);
      const upstreamSha = upstreamShaStep.stdoutTail?.trim();
      if (!upstreamShaStep.stdoutTail || !upstreamSha) {
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "no-upstream-sha",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const revListStep = await runStep(
        step(
          "git rev-list",
          ["git", "-C", gitRoot, "rev-list", `--max-count=${PREFLIGHT_MAX_COMMITS}`, upstreamSha],
          gitRoot,
        ),
      );
      steps.push(revListStep);
      if (revListStep.exitCode !== 0) {
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "preflight-revlist-failed",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const candidates = (revListStep.stdoutTail ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (candidates.length === 0) {
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "preflight-no-candidates",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const manager = await detectPackageManager(gitRoot);
      const preflightRoot = await fs.mkdtemp(path.join(os.tmpdir(), "powerdirector-update-preflight-"));
      const worktreeDir = path.join(preflightRoot, "worktree");
      const worktreeStep = await runStep(
        step(
          "preflight worktree",
          ["git", "-C", gitRoot, "worktree", "add", "--detach", worktreeDir, upstreamSha],
          gitRoot,
        ),
      );
      steps.push(worktreeStep);
      if (worktreeStep.exitCode !== 0) {
        await fs.rm(preflightRoot, { recursive: true, force: true }).catch(() => { });
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "preflight-worktree-failed",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      let selectedSha: string | null = null;
      try {
        for (const sha of candidates) {
          const shortSha = sha.slice(0, 8);
          const checkoutStep = await runStep(
            step(
              `preflight checkout (${shortSha})`,
              ["git", "-C", worktreeDir, "checkout", "--detach", sha],
              worktreeDir,
            ),
          );
          steps.push(checkoutStep);
          if (checkoutStep.exitCode !== 0) {
            continue;
          }

          const depsStep = await runStep(
            step(`preflight deps install (${shortSha})`, managerInstallArgs(manager), worktreeDir),
          );
          steps.push(depsStep);
          if (depsStep.exitCode !== 0) {
            continue;
          }

          const buildStep = await runStep(
            step(`preflight build (${shortSha})`, managerScriptArgs(manager, "build"), worktreeDir),
          );
          steps.push(buildStep);
          if (buildStep.exitCode !== 0) {
            continue;
          }

          const lintStep = await runStep(
            step(`preflight lint (${shortSha})`, managerScriptArgs(manager, "lint"), worktreeDir),
          );
          steps.push(lintStep);
          if (lintStep.exitCode !== 0) {
            continue;
          }

          selectedSha = sha;
          break;
        }
      } finally {
        const removeStep = await runStep(
          step(
            "preflight cleanup",
            ["git", "-C", gitRoot, "worktree", "remove", "--force", worktreeDir],
            gitRoot,
          ),
        );
        steps.push(removeStep);
        await runCommand(["git", "-C", gitRoot, "worktree", "prune"], {
          cwd: gitRoot,
          timeoutMs,
        }).catch(() => null);
        await fs.rm(preflightRoot, { recursive: true, force: true }).catch(() => { });
      }

      if (!selectedSha) {
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "preflight-no-good-commit",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const rebaseStep = await runStep(
        step("git rebase", ["git", "-C", gitRoot, "rebase", selectedSha], gitRoot),
      );
      steps.push(rebaseStep);
      if (rebaseStep.exitCode !== 0) {
        const abortResult = await runCommand(["git", "-C", gitRoot, "rebase", "--abort"], {
          cwd: gitRoot,
          timeoutMs,
        });
        steps.push({
          name: "git rebase --abort",
          command: "git rebase --abort",
          cwd: gitRoot,
          durationMs: 0,
          exitCode: abortResult.code,
          stdoutTail: trimLogTail(abortResult.stdout, MAX_LOG_CHARS),
          stderrTail: trimLogTail(abortResult.stderr, MAX_LOG_CHARS),
        });
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "rebase-failed",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }
    } else {
      const fetchStep = await runStep(
        step(
          "git fetch",
          ["git", "-C", gitRoot, "fetch", "--all", "--prune", "--tags", "--force"],
          gitRoot,
        ),
      );
      steps.push(fetchStep);
      if (fetchStep.exitCode !== 0) {
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "fetch-failed",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const tag = await resolveGitChannelTag(runCommand, gitRoot, timeoutMs, channel);
      if (!tag) {
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "no-release-tag",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const failure = await runGitCheckoutOrFail(`git checkout ${tag}`, [
        "git",
        "-C",
        gitRoot,
        "checkout",
        "--detach",
        tag,
      ]);
      if (failure) {
        return failure;
      }
    }

    const manager = await detectPackageManager(gitRoot);

    const depsStep = await runStep(step("deps install", managerInstallArgs(manager), gitRoot));
    steps.push(depsStep);
    if (depsStep.exitCode !== 0) {
      return finalizeGitResult({
        status: "error",
        mode: "git",
        root: gitRoot,
        reason: "deps-install-failed",
        before: { sha: beforeSha, version: beforeVersion },
        steps,
        durationMs: Date.now() - startedAt,
      });
    }

    const buildStep = await runStep(step("build", managerScriptArgs(manager, "build"), gitRoot));
    steps.push(buildStep);
    if (buildStep.exitCode !== 0) {
      return finalizeGitResult({
        status: "error",
        mode: "git",
        root: gitRoot,
        reason: "build-failed",
        before: { sha: beforeSha, version: beforeVersion },
        steps,
        durationMs: Date.now() - startedAt,
      });
    }

    const uiBuildStep = await runStep(
      step("ui:build", managerScriptArgs(manager, "ui:build"), gitRoot),
    );
    steps.push(uiBuildStep);
    if (uiBuildStep.exitCode !== 0) {
      return finalizeGitResult({
        status: "error",
        mode: "git",
        root: gitRoot,
        reason: "ui-build-failed",
        before: { sha: beforeSha, version: beforeVersion },
        steps,
        durationMs: Date.now() - startedAt,
      });
    }

    const doctorEntry = path.join(gitRoot, "powerdirector.mjs");
    const doctorEntryExists = await fs
      .stat(doctorEntry)
      .then(() => true)
      .catch(() => false);
    if (!doctorEntryExists) {
      steps.push({
        name: "powerdirector doctor entry",
        command: `verify ${doctorEntry}`,
        cwd: gitRoot,
        durationMs: 0,
        exitCode: 1,
        stderrTail: `missing ${doctorEntry}`,
      });
      return finalizeGitResult({
        status: "error",
        mode: "git",
        root: gitRoot,
        reason: "doctor-entry-missing",
        before: { sha: beforeSha, version: beforeVersion },
        steps,
        durationMs: Date.now() - startedAt,
      });
    }

    // Use --fix so that doctor auto-strips unknown config keys introduced by
    // schema changes between versions, preventing a startup validation crash.
    const doctorArgv = [process.execPath, doctorEntry, "doctor", "--non-interactive", "--fix"];
    const doctorStep = await runStep(
      step("powerdirector doctor", doctorArgv, gitRoot, { POWERDIRECTOR_UPDATE_IN_PROGRESS: "1" }),
    );
    steps.push(doctorStep);

    const uiIndexHealth = await resolveControlUiDistIndexHealth({ root: gitRoot });
    if (!uiIndexHealth.exists) {
      const repairArgv = managerScriptArgs(manager, "ui:build");
      const repairStep = await runStep(
        step("ui:build (post-doctor repair)", repairArgv, gitRoot),
      );
      steps.push(repairStep);

      if (repairStep.exitCode !== 0) {
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: repairStep.name,
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }

      const repairedUiIndexHealth = await resolveControlUiDistIndexHealth({ root: gitRoot });
      if (!repairedUiIndexHealth.exists) {
        const uiIndexPath =
          repairedUiIndexHealth.indexPath ?? resolveControlUiDistIndexPathForRoot(gitRoot);
        steps.push({
          name: "ui assets verify",
          command: `verify ${uiIndexPath}`,
          cwd: gitRoot,
          durationMs: 0,
          exitCode: 1,
          stderrTail: `missing ${uiIndexPath}`,
        });
        return finalizeGitResult({
          status: "error",
          mode: "git",
          root: gitRoot,
          reason: "ui-assets-missing",
          before: { sha: beforeSha, version: beforeVersion },
          steps,
          durationMs: Date.now() - startedAt,
        });
      }
    }

    const failedStep = steps.find((s) => s.exitCode !== 0);
    const afterShaStep = await runStep(
      step("git rev-parse HEAD (after)", ["git", "-C", gitRoot, "rev-parse", "HEAD"], gitRoot),
    );
    steps.push(afterShaStep);
    const afterVersion = await readPackageVersion(gitRoot);

    return finalizeGitResult({
      status: failedStep ? "error" : "ok",
      mode: "git",
      root: gitRoot,
      reason: failedStep ? failedStep.name : undefined,
      before: { sha: beforeSha, version: beforeVersion },
      after: {
        sha: afterShaStep.stdoutTail?.trim() ?? null,
        version: afterVersion,
      },
      steps,
      durationMs: Date.now() - startedAt,
    });
  }

  if (!pkgRoot) {
    return {
      status: "error",
      mode: "unknown",
      reason: `no root (${START_DIRS.join(",")})`,
      steps: [],
      durationMs: Date.now() - startedAt,
    };
  }

  const beforeVersion = await readPackageVersion(pkgRoot);
  const globalManager = await detectGlobalInstallManagerForRoot(runCommand, pkgRoot, timeoutMs);
  if (globalManager) {
    const packageName = (await readPackageName(pkgRoot)) ?? DEFAULT_PACKAGE_NAME;
    await cleanupGlobalRenameDirs({
      globalRoot: path.dirname(pkgRoot),
      packageName,
    });
    const channel = opts.channel ?? DEFAULT_PACKAGE_CHANNEL;
    const tag = normalizeTag(opts.tag ?? channelToNpmTag(channel));
    const spec = `${packageName}@${tag}`;
    const updateStep = await runStep({
      runCommand,
      name: "global update",
      argv: globalInstallArgs(globalManager, spec),
      cwd: pkgRoot,
      timeoutMs,
      progress,
      stepIndex: 0,
      totalSteps: 1,
    });
    const steps = [updateStep];
    const afterVersion = await readPackageVersion(pkgRoot);
    return {
      status: updateStep.exitCode === 0 ? "ok" : "error",
      mode: globalManager,
      root: pkgRoot,
      reason: updateStep.exitCode === 0 ? undefined : updateStep.name,
      before: { version: beforeVersion },
      after: { version: afterVersion },
      steps,
      durationMs: Date.now() - startedAt,
    };
  }

  return {
    status: "skipped",
    mode: "unknown",
    root: pkgRoot,
    reason: "not-git-install",
    before: { version: beforeVersion },
    steps: [],
    durationMs: Date.now() - startedAt,
  };
}
