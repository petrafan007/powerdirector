import { afterEach, describe, expect, it, vi } from "vitest";
import { buildGitDirtyCheckArgv } from "./update-git-runtime-files.js";

const runCommandWithTimeout = vi.fn();

vi.mock("../process/exec.js", () => ({
  runCommandWithTimeout,
}));

describe("checkGitUpdateStatus dirty filtering", () => {
  afterEach(() => {
    runCommandWithTimeout.mockReset();
  });

  it("ignores runtime-only git status lines", async () => {
    const root = "/tmp/powerdirector";
    const dirtyKey = buildGitDirtyCheckArgv(root).join(" ");

    runCommandWithTimeout.mockImplementation(async (argv: string[]) => {
      const key = argv.join(" ");
      if (key === `git -C ${root} rev-parse --abbrev-ref HEAD`) {
        return { stdout: "master\n", stderr: "", code: 0 };
      }
      if (key === `git -C ${root} rev-parse HEAD`) {
        return { stdout: "abc123\n", stderr: "", code: 0 };
      }
      if (key === `git -C ${root} describe --tags --exact-match`) {
        return { stdout: "", stderr: "fatal: no tag", code: 128 };
      }
      if (key === `git -C ${root} rev-parse --abbrev-ref @{upstream}`) {
        return { stdout: "origin/master\n", stderr: "", code: 0 };
      }
      if (key === dirtyKey) {
        return {
          stdout: ["?? .powerdirector/", "?? .env.local", "?? powerdirector.config.json.tmp"].join(
            "\n",
          ),
          stderr: "",
          code: 0,
        };
      }
      if (key === `git -C ${root} rev-list --left-right --count HEAD...origin/master`) {
        return { stdout: "0\t0\n", stderr: "", code: 0 };
      }
      throw new Error(`Unexpected command: ${key}`);
    });

    const { checkGitUpdateStatus } = await import("./update-check.js");
    const status = await checkGitUpdateStatus({ root, timeoutMs: 1000, fetch: false });

    expect(status.branch).toBe("master");
    expect(status.upstream).toBe("origin/master");
    expect(status.dirty).toBe(false);
  });

  it("keeps real tracked changes dirty", async () => {
    const root = "/tmp/powerdirector";
    const dirtyKey = buildGitDirtyCheckArgv(root).join(" ");

    runCommandWithTimeout.mockImplementation(async (argv: string[]) => {
      const key = argv.join(" ");
      if (key === `git -C ${root} rev-parse --abbrev-ref HEAD`) {
        return { stdout: "master\n", stderr: "", code: 0 };
      }
      if (key === `git -C ${root} rev-parse HEAD`) {
        return { stdout: "abc123\n", stderr: "", code: 0 };
      }
      if (key === `git -C ${root} describe --tags --exact-match`) {
        return { stdout: "", stderr: "fatal: no tag", code: 128 };
      }
      if (key === `git -C ${root} rev-parse --abbrev-ref @{upstream}`) {
        return { stdout: "origin/master\n", stderr: "", code: 0 };
      }
      if (key === dirtyKey) {
        return { stdout: " M README.md\n", stderr: "", code: 0 };
      }
      if (key === `git -C ${root} rev-list --left-right --count HEAD...origin/master`) {
        return { stdout: "0\t0\n", stderr: "", code: 0 };
      }
      throw new Error(`Unexpected command: ${key}`);
    });

    const { checkGitUpdateStatus } = await import("./update-check.js");
    const status = await checkGitUpdateStatus({ root, timeoutMs: 1000, fetch: false });

    expect(status.dirty).toBe(true);
  });
});
