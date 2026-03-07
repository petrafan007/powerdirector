import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateCheckResult } from "./update-check.js";

vi.mock("./powerdirector-root.js", () => ({
  resolvePowerDirectorPackageRoot: vi.fn(),
}));

vi.mock("../process/exec.js", () => ({
  runCommandWithTimeout: vi.fn(),
}));

vi.mock("./update-check.js", async () => {
  const parse = (value: string) => {
    const match = value.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) {
      return null;
    }
    return {
      major: Number.parseInt(match[1] ?? "", 10),
      minor: Number.parseInt(match[2] ?? "", 10),
      patch: Number.parseInt(match[3] ?? "", 10),
      prerelease: match[4] ?? null,
    };
  };
  const compareSemverStrings = (a: string, b: string) => {
    const left = parse(a);
    const right = parse(b);
    if (!left || !right) {
      return 0;
    }
    if (left.major !== right.major) {
      return left.major < right.major ? -1 : 1;
    }
    if (left.minor !== right.minor) {
      return left.minor < right.minor ? -1 : 1;
    }
    if (left.patch !== right.patch) {
      return left.patch < right.patch ? -1 : 1;
    }
    if (left.prerelease && !right.prerelease) {
      return -1;
    }
    if (!left.prerelease && right.prerelease) {
      return 1;
    }
    if (left.prerelease && right.prerelease && left.prerelease !== right.prerelease) {
      return left.prerelease < right.prerelease ? -1 : 1;
    }
    return 0;
  };

  return {
    checkUpdateStatus: vi.fn(),
    compareSemverStrings,
    resolveNpmChannelTag: vi.fn(),
  };
});

vi.mock("../version.js", () => ({
  VERSION: "1.0.0",
}));

describe("update-startup", () => {
  let suiteRoot = "";
  let suiteCase = 0;
  let tempDir: string;
  let prevStateDir: string | undefined;
  let prevNodeEnv: string | undefined;
  let prevVitest: string | undefined;
  let hadStateDir = false;
  let hadNodeEnv = false;
  let hadVitest = false;

  let resolvePowerDirectorPackageRoot: (typeof import("./powerdirector-root.js"))["resolvePowerDirectorPackageRoot"];
  let checkUpdateStatus: (typeof import("./update-check.js"))["checkUpdateStatus"];
  let resolveNpmChannelTag: (typeof import("./update-check.js"))["resolveNpmChannelTag"];
  let runCommandWithTimeout: (typeof import("../process/exec.js"))["runCommandWithTimeout"];
  let runGatewayUpdateCheck: (typeof import("./update-startup.js"))["runGatewayUpdateCheck"];
  let getUpdateAvailable: (typeof import("./update-startup.js"))["getUpdateAvailable"];
  let resetUpdateAvailableStateForTest: (typeof import("./update-startup.js"))["resetUpdateAvailableStateForTest"];
  let loaded = false;

  beforeAll(async () => {
    suiteRoot = await fs.mkdtemp(path.join(os.tmpdir(), "powerdirector-update-check-suite-"));
  });

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17T10:00:00Z"));
    tempDir = path.join(suiteRoot, `case-${++suiteCase}`);
    await fs.mkdir(tempDir);
    hadStateDir = Object.prototype.hasOwnProperty.call(process.env, "POWERDIRECTOR_STATE_DIR");
    prevStateDir = process.env.POWERDIRECTOR_STATE_DIR;
    process.env.POWERDIRECTOR_STATE_DIR = tempDir;

    hadNodeEnv = Object.prototype.hasOwnProperty.call(process.env, "NODE_ENV");
    prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    // Ensure update checks don't short-circuit in test mode.
    hadVitest = Object.prototype.hasOwnProperty.call(process.env, "VITEST");
    prevVitest = process.env.VITEST;
    delete process.env.VITEST;

    // Perf: load mocked modules once (after timers/env are set up).
    if (!loaded) {
      ({ resolvePowerDirectorPackageRoot } = await import("./powerdirector-root.js"));
      ({ checkUpdateStatus, resolveNpmChannelTag } = await import("./update-check.js"));
      ({ runCommandWithTimeout } = await import("../process/exec.js"));
      ({ runGatewayUpdateCheck, getUpdateAvailable, resetUpdateAvailableStateForTest } =
        await import("./update-startup.js"));
      loaded = true;
    }
    vi.mocked(resolvePowerDirectorPackageRoot).mockReset();
    vi.mocked(checkUpdateStatus).mockReset();
    vi.mocked(resolveNpmChannelTag).mockReset();
    vi.mocked(runCommandWithTimeout).mockReset();
    resetUpdateAvailableStateForTest();
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (hadStateDir) {
      process.env.POWERDIRECTOR_STATE_DIR = prevStateDir;
    } else {
      delete process.env.POWERDIRECTOR_STATE_DIR;
    }
    if (hadNodeEnv) {
      process.env.NODE_ENV = prevNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    if (hadVitest) {
      process.env.VITEST = prevVitest;
    } else {
      delete process.env.VITEST;
    }
    resetUpdateAvailableStateForTest();
  });

  afterAll(async () => {
    if (suiteRoot) {
      await fs.rm(suiteRoot, { recursive: true, force: true });
    }
    suiteRoot = "";
    suiteCase = 0;
  });

  async function runUpdateCheckAndReadState(channel: "stable" | "beta") {
    vi.mocked(resolvePowerDirectorPackageRoot).mockResolvedValue("/opt/powerdirector");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/powerdirector",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag).mockResolvedValue({
      tag: "latest",
      version: "2.0.0",
    });

    const log = { info: vi.fn() };
    await runGatewayUpdateCheck({
      cfg: { update: { channel } },
      log,
      isNixMode: false,
      allowInTests: true,
    });

    const statePath = path.join(tempDir, "update-check.json");
    const parsed = JSON.parse(await fs.readFile(statePath, "utf-8")) as {
      lastNotifiedVersion?: string;
      lastNotifiedTag?: string;
      lastAvailableVersion?: string;
      lastAvailableTag?: string;
    };
    return { log, parsed };
  }

  it.each([
    {
      name: "stable channel",
      channel: "stable" as const,
    },
    {
      name: "beta channel with older beta tag",
      channel: "beta" as const,
    },
  ])("logs latest update hint for $name", async ({ channel }) => {
    const { log, parsed } = await runUpdateCheckAndReadState(channel);

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining("update available (latest): 2.0.0"),
    );
    expect(parsed.lastNotifiedVersion).toBe("2.0.0");
    expect(parsed.lastAvailableVersion).toBe("2.0.0");
    expect(parsed.lastNotifiedTag).toBe("latest");
  });

  it("hydrates cached update from persisted state during throttle window", async () => {
    const statePath = path.join(tempDir, "update-check.json");
    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          lastCheckedAt: new Date(Date.now()).toISOString(),
          lastAvailableVersion: "2.0.0",
          lastAvailableTag: "latest",
        },
        null,
        2,
      ),
      "utf-8",
    );
    vi.mocked(resolvePowerDirectorPackageRoot).mockResolvedValue("/opt/powerdirector");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/powerdirector",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);

    const onUpdateAvailableChange = vi.fn();
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      onUpdateAvailableChange,
    });

    expect(vi.mocked(checkUpdateStatus)).toHaveBeenCalledWith({
      root: "/opt/powerdirector",
      timeoutMs: 2500,
      fetchGit: false,
      includeRegistry: false,
    });
    expect(onUpdateAvailableChange).toHaveBeenCalledWith({
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      channel: "latest",
    });
    expect(getUpdateAvailable()).toEqual({
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      channel: "latest",
    });
  });

  it("hydrates cached same-version git updates during throttle window when the target sha differs", async () => {
    const statePath = path.join(tempDir, "update-check.json");
    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          lastCheckedAt: new Date(Date.now()).toISOString(),
          lastAvailableVersion: "1.0.0",
          lastAvailableTag: "v1.0.0",
          lastAvailableSha: "def456",
        },
        null,
        2,
      ),
      "utf-8",
    );
    vi.mocked(resolvePowerDirectorPackageRoot).mockResolvedValue("/opt/powerdirector");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/powerdirector",
      installKind: "git",
      packageManager: "pnpm",
      git: {
        root: "/opt/powerdirector",
        sha: "abc123",
        tag: "v1.0.0",
        branch: "HEAD",
        upstream: null,
        dirty: false,
        ahead: 0,
        behind: 0,
        fetchOk: null,
      },
    } satisfies UpdateCheckResult);

    const onUpdateAvailableChange = vi.fn();
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      onUpdateAvailableChange,
    });

    expect(vi.mocked(checkUpdateStatus)).toHaveBeenCalledWith({
      root: "/opt/powerdirector",
      timeoutMs: 2500,
      fetchGit: false,
      includeRegistry: false,
    });
    expect(onUpdateAvailableChange).toHaveBeenCalledWith({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      channel: "v1.0.0",
      latestSha: "def456",
    });
    expect(getUpdateAvailable()).toEqual({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      channel: "v1.0.0",
      latestSha: "def456",
    });
  });

  it("emits update change callback when update state clears", async () => {
    vi.mocked(resolvePowerDirectorPackageRoot).mockResolvedValue("/opt/powerdirector");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/powerdirector",
      installKind: "package",
      packageManager: "npm",
    } satisfies UpdateCheckResult);
    vi.mocked(resolveNpmChannelTag)
      .mockResolvedValueOnce({
        tag: "latest",
        version: "2.0.0",
      })
      .mockResolvedValueOnce({
        tag: "latest",
        version: "1.0.0",
      });

    const onUpdateAvailableChange = vi.fn();
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      onUpdateAvailableChange,
    });
    vi.setSystemTime(new Date("2026-01-18T11:00:00Z"));
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
      onUpdateAvailableChange,
    });

    expect(onUpdateAvailableChange).toHaveBeenNthCalledWith(1, {
      currentVersion: "1.0.0",
      latestVersion: "2.0.0",
      channel: "latest",
    });
    expect(onUpdateAvailableChange).toHaveBeenNthCalledWith(2, null);
    expect(getUpdateAvailable()).toBeNull();
  });

  it("uses git tags for stable channel checks in git installs", async () => {
    vi.mocked(resolvePowerDirectorPackageRoot).mockResolvedValue("/opt/powerdirector");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/powerdirector",
      installKind: "git",
      packageManager: "pnpm",
      git: {
        root: "/opt/powerdirector",
        sha: "abc123",
        tag: "v1.0.0",
        branch: "HEAD",
        upstream: null,
        dirty: false,
        ahead: 0,
        behind: 0,
        fetchOk: true,
      },
    } satisfies UpdateCheckResult);
    vi.mocked(runCommandWithTimeout).mockImplementation(async (argv) => {
      const key = argv.join(" ");
      if (key === "git -C /opt/powerdirector tag --list v* --sort=-v:refname") {
        return { stdout: "v1.0.1\nv1.0.0-beta.1\n", stderr: "", code: 0 };
      }
      if (key === "git -C /opt/powerdirector rev-list -n 1 v1.0.1") {
        return { stdout: "def456\n", stderr: "", code: 0 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });

    const log = { info: vi.fn() };
    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log,
      isNixMode: false,
      allowInTests: true,
    });

    expect(vi.mocked(resolveNpmChannelTag)).not.toHaveBeenCalled();
    expect(getUpdateAvailable()).toEqual({
      currentVersion: "1.0.0",
      latestVersion: "1.0.1",
      channel: "v1.0.1",
      latestSha: "def456",
    });
  });

  it("prefers stable git tags over matching prereleases on beta channel", async () => {
    vi.mocked(resolvePowerDirectorPackageRoot).mockResolvedValue("/opt/powerdirector");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/powerdirector",
      installKind: "git",
      packageManager: "pnpm",
      git: {
        root: "/opt/powerdirector",
        sha: "abc123",
        tag: "v1.0.0-beta.1",
        branch: "HEAD",
        upstream: null,
        dirty: false,
        ahead: 0,
        behind: 0,
        fetchOk: true,
      },
    } satisfies UpdateCheckResult);
    vi.mocked(runCommandWithTimeout).mockImplementation(async (argv) => {
      const key = argv.join(" ");
      if (key === "git -C /opt/powerdirector tag --list v* --sort=-v:refname") {
        return { stdout: "v1.0.0-beta.2\nv1.0.0\n", stderr: "", code: 0 };
      }
      if (key === "git -C /opt/powerdirector rev-list -n 1 v1.0.0") {
        return { stdout: "def456\n", stderr: "", code: 0 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });

    await runGatewayUpdateCheck({
      cfg: { update: { channel: "beta" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
    });

    expect(getUpdateAvailable()).toEqual({
      currentVersion: "1.0.0-beta.1",
      latestVersion: "1.0.0",
      channel: "v1.0.0",
      latestSha: "def456",
    });
  });

  it("treats a force-updated git tag as available when the version string is unchanged", async () => {
    vi.mocked(resolvePowerDirectorPackageRoot).mockResolvedValue("/opt/powerdirector");
    vi.mocked(checkUpdateStatus).mockResolvedValue({
      root: "/opt/powerdirector",
      installKind: "git",
      packageManager: "pnpm",
      git: {
        root: "/opt/powerdirector",
        sha: "abc123",
        tag: null,
        branch: "HEAD",
        upstream: null,
        dirty: false,
        ahead: 0,
        behind: 0,
        fetchOk: true,
      },
    } satisfies UpdateCheckResult);
    vi.mocked(runCommandWithTimeout).mockImplementation(async (argv) => {
      const key = argv.join(" ");
      if (key === "git -C /opt/powerdirector tag --list v* --sort=-v:refname") {
        return { stdout: "v1.0.0\n", stderr: "", code: 0 };
      }
      if (key === "git -C /opt/powerdirector rev-list -n 1 v1.0.0") {
        return { stdout: "def456\n", stderr: "", code: 0 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });

    await runGatewayUpdateCheck({
      cfg: { update: { channel: "stable" } },
      log: { info: vi.fn() },
      isNixMode: false,
      allowInTests: true,
    });

    expect(getUpdateAvailable()).toEqual({
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      channel: "v1.0.0",
      latestSha: "def456",
    });
  });

  it("skips update check when disabled in config", async () => {
    const log = { info: vi.fn() };

    await runGatewayUpdateCheck({
      cfg: { update: { checkOnStart: false } },
      log,
      isNixMode: false,
      allowInTests: true,
    });

    expect(log.info).not.toHaveBeenCalled();
    await expect(fs.stat(path.join(tempDir, "update-check.json"))).rejects.toThrow();
  });
});
