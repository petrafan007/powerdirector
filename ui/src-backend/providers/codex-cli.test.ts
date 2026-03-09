import { EventEmitter } from "node:events";
import { describe, expect, it, vi, beforeEach } from "vitest";

const spawnMock = vi.fn();

vi.mock("child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

import {
  CodexCLIProvider,
  normalizeCodexCliReasoningEffort,
  summarizeCodexCliStderr,
} from "./codex-cli.ts";

class FakeStdin extends EventEmitter {
  public written = "";

  write(chunk: string, callback?: () => void) {
    this.written += chunk;
    callback?.();
    return true;
  }

  end() {
    return true;
  }
}

function createChild(params: { stdout?: string; stderr?: string; code?: number } = {}) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: FakeStdin;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = new FakeStdin();
  child.kill = vi.fn();

  queueMicrotask(() => {
    if (params.stdout) {
      child.stdout.emit("data", Buffer.from(params.stdout));
    }
    if (params.stderr) {
      child.stderr.emit("data", Buffer.from(params.stderr));
    }
    child.emit("close", params.code ?? 0);
  });

  return child;
}

describe("CodexCLIProvider", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("normalizes configured reasoning effort aliases", () => {
    expect(normalizeCodexCliReasoningEffort("HIGH")).toBe("high");
    expect(normalizeCodexCliReasoningEffort("extra-high")).toBe("xhigh");
    expect(normalizeCodexCliReasoningEffort("nope")).toBeUndefined();
  });

  it("summarizes repeated stderr diagnostics", () => {
    const stderr = [
      "OpenAI Codex v0.101.0",
      "2026-03-09T00:22:38.944250Z  WARN codex_state::runtime: failed to open state db at /home/test/.codex/state_5.sqlite: migration 9 was previously applied but is missing in the resolved migrations",
      "2026-03-09T00:22:38.965539Z ERROR codex_core::rollout::list: state db missing rollout path for thread abc",
      "2026-03-09T00:22:39.044250Z  WARN codex_state::runtime: failed to open state db at /home/test/.codex/state_5.sqlite: migration 9 was previously applied but is missing in the resolved migrations",
    ].join("\n");

    expect(summarizeCodexCliStderr(stderr)).toEqual([
      "WARN codex_state::runtime: failed to open state db at /home/test/.codex/state_5.sqlite: migration 9 was previously applied but is missing in the resolved migrations (x2)",
      "ERROR codex_core::rollout::list: state db missing rollout path for thread abc",
    ]);
  });

  it("passes explicit reasoning when configured by provider and per-model overrides", async () => {
    let capturedArgs: string[] = [];
    spawnMock.mockImplementation((_command: string, args: string[]) => {
      capturedArgs = args;
      return createChild({ stdout: "ok" });
    });

    const provider = new CodexCLIProvider("gpt-5.4", "unrestricted", {}, {
      defaultReasoningEffort: "medium",
      modelReasoningEfforts: {
        "openai-codex/gpt-5.4": "xhigh",
      },
    });

    await expect(provider.completion("Reply with ok.", "gpt-5.4")).resolves.toBe("ok");
    expect(capturedArgs).toContain("-c");
    expect(capturedArgs).toContain("model_reasoning_effort=xhigh");
  });

  it("lets an explicit request override config defaults", async () => {
    let capturedArgs: string[] = [];
    spawnMock.mockImplementation((_command: string, args: string[]) => {
      capturedArgs = args;
      return createChild({ stdout: "ok" });
    });

    const provider = new CodexCLIProvider("gpt-5.4", "unrestricted", {}, {
      defaultReasoningEffort: "medium",
    });

    await expect(
      provider.completion("Reply with ok.", "gpt-5.4", { reasoning: "low" }),
    ).resolves.toBe("ok");
    expect(capturedArgs).toContain("model_reasoning_effort=low");
  });
});
