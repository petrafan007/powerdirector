import fs from "node:fs/promises";
import path from "node:path";
import { formatCliCommand } from "../cli/command-format.js";
import type { loadConfig } from "../config/config.js";
import { resolveStateDir } from "../config/paths.js";
import { runCommandWithTimeout } from "../process/exec.js";
import { VERSION } from "../version.js";
import { resolvePowerDirectorPackageRoot } from "./powerdirector-root.js";
import { normalizeVersionTag, resolveGitChannelRelease } from "./update-git-channel.js";
import { normalizeUpdateChannel, DEFAULT_PACKAGE_CHANNEL } from "./update-channels.js";
import { compareSemverStrings, resolveNpmChannelTag, checkUpdateStatus } from "./update-check.js";

type UpdateCheckState = {
  lastCheckedAt?: string;
  lastNotifiedVersion?: string;
  lastNotifiedTag?: string;
  lastNotifiedSha?: string;
  lastAvailableVersion?: string;
  lastAvailableTag?: string;
  lastAvailableSha?: string;
};

export type UpdateAvailable = {
  currentVersion: string;
  latestVersion: string;
  channel: string;
  latestSha?: string | null;
};

let updateAvailableCache: UpdateAvailable | null = null;

export function getUpdateAvailable(): UpdateAvailable | null {
  return updateAvailableCache;
}

export function resetUpdateAvailableStateForTest(): void {
  updateAvailableCache = null;
}

const UPDATE_CHECK_FILENAME = "update-check.json";
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

function shouldSkipCheck(allowInTests: boolean): boolean {
  if (allowInTests) {
    return false;
  }
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return true;
  }
  return false;
}

async function readState(statePath: string): Promise<UpdateCheckState> {
  try {
    const raw = await fs.readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as UpdateCheckState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeState(statePath: string, state: UpdateCheckState): Promise<void> {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
}

function sameUpdateAvailable(a: UpdateAvailable | null, b: UpdateAvailable | null): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.currentVersion === b.currentVersion &&
    a.latestVersion === b.latestVersion &&
    a.channel === b.channel &&
    (a.latestSha ?? null) === (b.latestSha ?? null)
  );
}

function setUpdateAvailableCache(params: {
  next: UpdateAvailable | null;
  onUpdateAvailableChange?: (updateAvailable: UpdateAvailable | null) => void;
}): void {
  if (sameUpdateAvailable(updateAvailableCache, params.next)) {
    return;
  }
  updateAvailableCache = params.next;
  params.onUpdateAvailableChange?.(params.next);
}

function resolvePersistedUpdateAvailable(state: UpdateCheckState): UpdateAvailable | null {
  const latestVersion = state.lastAvailableVersion?.trim();
  if (!latestVersion) {
    return null;
  }
  const cmp = compareSemverStrings(VERSION, latestVersion);
  if (cmp == null || cmp >= 0) {
    return null;
  }
  const channel = state.lastAvailableTag?.trim() || DEFAULT_PACKAGE_CHANNEL;
  return {
    currentVersion: VERSION,
    latestVersion,
    channel,
    ...(state.lastAvailableSha?.trim() ? { latestSha: state.lastAvailableSha.trim() } : {}),
  };
}

export async function runGatewayUpdateCheck(params: {
  cfg: ReturnType<typeof loadConfig>;
  log: { info: (msg: string, meta?: Record<string, unknown>) => void };
  isNixMode: boolean;
  allowInTests?: boolean;
  checkIntervalMs?: number;
  onUpdateAvailableChange?: (updateAvailable: UpdateAvailable | null) => void;
}): Promise<void> {
  if (shouldSkipCheck(Boolean(params.allowInTests))) {
    return;
  }
  if (params.isNixMode) {
    return;
  }
  if (params.cfg.update?.checkOnStart === false) {
    return;
  }

  const statePath = path.join(resolveStateDir(), UPDATE_CHECK_FILENAME);
  const state = await readState(statePath);
  const now = Date.now();
  const lastCheckedAt = state.lastCheckedAt ? Date.parse(state.lastCheckedAt) : null;
  const persistedAvailable = resolvePersistedUpdateAvailable(state);
  setUpdateAvailableCache({
    next: persistedAvailable,
    onUpdateAvailableChange: params.onUpdateAvailableChange,
  });

  const interval = params.checkIntervalMs ?? UPDATE_CHECK_INTERVAL_MS;
  if (lastCheckedAt && Number.isFinite(lastCheckedAt)) {
    if (now - lastCheckedAt < interval) {
      return;
    }
  }

  const root = await resolvePowerDirectorPackageRoot({
    moduleUrl: import.meta.url,
    argv1: process.argv[1],
    cwd: process.cwd(),
  });
  const status = await checkUpdateStatus({
    root,
    timeoutMs: 2500,
    fetchGit: true,
    includeRegistry: false,
  });
  const currentVersion =
    status.installKind === "git" ? normalizeVersionTag(status.git?.tag ?? null) ?? VERSION : VERSION;

  const nextState: UpdateCheckState = {
    ...state,
    lastCheckedAt: new Date(now).toISOString(),
  };

  if (status.installKind !== "package" && status.installKind !== "git") {
    delete nextState.lastAvailableVersion;
    delete nextState.lastAvailableTag;
    setUpdateAvailableCache({
      next: null,
      onUpdateAvailableChange: params.onUpdateAvailableChange,
    });
    await writeState(statePath, nextState);
    return;
  }

  const channel = normalizeUpdateChannel(params.cfg.update?.channel) ?? DEFAULT_PACKAGE_CHANNEL;

  let isUpdateAvailable = false;
  let tag = "";
  let latestAvailableVersion = "";
  let latestAvailableSha: string | null = null;

  if (status.installKind === "git" && channel === "dev") {
    tag = "dev";
    isUpdateAvailable = (status.git?.behind ?? 0) > 0;
    latestAvailableVersion = isUpdateAvailable ? "newer-commits" : VERSION;
  } else if (status.installKind === "git") {
    const gitChannel = channel === "beta" ? "beta" : "stable";
    const gitRoot = status.root ?? root;
    if (!gitRoot) {
      await writeState(statePath, nextState);
      return;
    }
    const resolved = await resolveGitChannelRelease(
      async (argv, options) => {
        const res = await runCommandWithTimeout(argv, options);
        return { stdout: res.stdout, stderr: res.stderr, code: res.code };
      },
      gitRoot,
      2500,
      gitChannel,
    );
    if (!resolved.version || !resolved.tag) {
      await writeState(statePath, nextState);
      return;
    }
    tag = resolved.tag;
    latestAvailableSha = resolved.sha;
    const cmp = compareSemverStrings(currentVersion, resolved.version);
    isUpdateAvailable =
      (cmp != null && cmp < 0) ||
      (cmp === 0 &&
        Boolean(resolved.sha) &&
        Boolean(status.git?.sha) &&
        resolved.sha !== status.git?.sha);
    latestAvailableVersion = resolved.version;
  } else {
    const resolved = await resolveNpmChannelTag({ channel, timeoutMs: 2500 });
    if (!resolved.version) {
      await writeState(statePath, nextState);
      return;
    }
    tag = resolved.tag;
    const cmp = compareSemverStrings(currentVersion, resolved.version);
    isUpdateAvailable = cmp != null && cmp < 0;
    latestAvailableVersion = resolved.version;
  }

  if (isUpdateAvailable) {
    const nextAvailable: UpdateAvailable = {
      currentVersion,
      latestVersion: latestAvailableVersion,
      channel: tag,
      ...(latestAvailableSha ? { latestSha: latestAvailableSha } : {}),
    };
    setUpdateAvailableCache({
      next: nextAvailable,
      onUpdateAvailableChange: params.onUpdateAvailableChange,
    });
    nextState.lastAvailableVersion = latestAvailableVersion;
    nextState.lastAvailableTag = tag;
    nextState.lastAvailableSha = latestAvailableSha ?? undefined;
    const shouldNotify =
      state.lastNotifiedVersion !== latestAvailableVersion ||
      state.lastNotifiedTag !== tag ||
      (state.lastNotifiedSha ?? null) !== (latestAvailableSha ?? null);
    if (shouldNotify) {
      params.log.info(
        `update available (${tag}): ${latestAvailableVersion} (current v${currentVersion}). Run: ${formatCliCommand("powerdirector update")}`,
      );
      nextState.lastNotifiedVersion = latestAvailableVersion;
      nextState.lastNotifiedTag = tag;
      nextState.lastNotifiedSha = latestAvailableSha ?? undefined;
    }
  } else {
    delete nextState.lastAvailableVersion;
    delete nextState.lastAvailableTag;
    delete nextState.lastAvailableSha;
    setUpdateAvailableCache({
      next: null,
      onUpdateAvailableChange: params.onUpdateAvailableChange,
    });
  }

  await writeState(statePath, nextState);
}

export function scheduleGatewayUpdateCheck(params: {
  cfg: ReturnType<typeof loadConfig>;
  log: { info: (msg: string, meta?: Record<string, unknown>) => void };
  isNixMode: boolean;
  onUpdateAvailableChange?: (updateAvailable: UpdateAvailable | null) => void;
}): void {
  void runGatewayUpdateCheck(params).catch(() => { });
}
