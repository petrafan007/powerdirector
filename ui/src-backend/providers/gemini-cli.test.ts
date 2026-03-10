import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

vi.mock("../core/logger.ts", () => ({
  getRuntimeLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { GeminiCLIProvider, summarizeGeminiCliStderr } from "./gemini-cli.ts";

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

function createChild() {
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
  return child;
}

describe("GeminiCLIProvider", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("summarizes repeated retry and capacity stderr diagnostics", () => {
    const stderr = [
      "Loaded cached credentials.",
      "Attempt 1 failed with status 429. Retrying with backoff...",
      "Attempt 1 failed with status 429. Retrying with backoff...",
      "Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:streamGenerateContent?alt=sse: [429 Too Many Requests] No capacity available for model gemini-3.1-pro-preview on the server",
    ].join("\n");

    expect(summarizeGeminiCliStderr(stderr)).toEqual([
      "Attempt 1 failed with status 429. Retrying with backoff... (x2)",
      "Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:streamGenerateContent?alt=sse: [429 Too Many Requests] No capacity available for model gemini-3.1-pro-preview on the server",
    ]);
  });

  it("emits a keepalive chunk when stderr shows retry progress before stdout", async () => {
    const child = createChild();
    spawnMock.mockReturnValue(child);

    const provider = new GeminiCLIProvider("gemini-3.1-pro-preview", {}, {
      command: "gemini",
    });

    const stream = provider.completionStream("Reply with exactly: gemini-ok", "gemini-3.1-pro-preview");
    const iterator = stream[Symbol.asyncIterator]();

    queueMicrotask(() => {
      child.stderr.emit(
        "data",
        Buffer.from("Loaded cached credentials.\nAttempt 1 failed with status 429. Retrying with backoff...\n"),
      );
      setTimeout(() => {
        child.stdout.emit("data", Buffer.from("gemini-ok"));
        child.emit("close", 0);
      }, 0);
    });

    await expect(iterator.next()).resolves.toEqual({ value: "", done: false });
    await expect(iterator.next()).resolves.toEqual({ value: "gemini-ok", done: false });
    await expect(iterator.next()).resolves.toEqual({ value: undefined, done: true });

    expect(spawnMock).toHaveBeenCalledWith(
      "gemini",
      ["--output-format", "text", "--approval-mode", "yolo", "--model", "gemini-3.1-pro-preview"],
      expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] }),
    );
    expect(child.stdin.written).toBe("Reply with exactly: gemini-ok");
  });

  it("fails when Gemini exits 0 after retry diagnostics but never produces stdout", async () => {
    const child = createChild();
    spawnMock.mockReturnValue(child);

    const provider = new GeminiCLIProvider("gemini-3.1-pro-preview", {}, {
      command: "gemini",
    });

    const stream = provider.completionStream("Reply with exactly: gemini-ok", "gemini-3.1-pro-preview");
    const iterator = stream[Symbol.asyncIterator]();

    queueMicrotask(() => {
      child.stderr.emit(
        "data",
        Buffer.from("Attempt 1 failed with status 429. Retrying with backoff...\nNo capacity available for model gemini-3.1-pro-preview on the server\n"),
      );
      setTimeout(() => {
        child.emit("close", 0);
      }, 0);
    });

    await expect(iterator.next()).resolves.toEqual({ value: "", done: false });
    await expect(iterator.next()).rejects.toThrow(/Gemini CLI produced no output: Attempt 1 failed with status 429/);
  });
});
