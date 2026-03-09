import { describe, expect, it, vi } from "vitest";
import { Agent } from "./agent.ts";
import { ToolRegistry } from "../tools/base.ts";

type StoredSession = {
  id: string;
  name: string;
  messages: any[];
  metadata: Record<string, unknown>;
};

class FakeSessionManager {
  private sessions = new Map<string, StoredSession>();

  createSession(id: string) {
    this.sessions.set(id, {
      id,
      name: id,
      messages: [],
      metadata: {},
    });
  }

  getSession(id: string) {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }
    return {
      ...session,
      messages: session.messages.map((message) => ({
        ...message,
        metadata:
          message.metadata && typeof message.metadata === "object"
            ? { ...message.metadata }
            : message.metadata,
      })),
    };
  }

  saveMessage(sessionId: string, message: any) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Missing session: ${sessionId}`);
    }
    session.messages.push({
      ...message,
      metadata:
        message.metadata && typeof message.metadata === "object"
          ? { ...message.metadata }
          : message.metadata,
    });
  }

  updateMessageMetadata(sessionId: string, timestamp: number, metadata: Record<string, any>) {
    const session = this.sessions.get(sessionId);
    const target = session?.messages.find((message) => message.timestamp === timestamp);
    if (target) {
      target.metadata = { ...metadata };
    }
  }

  clearSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
    }
  }

  compactSession() {}

  renameSession() {}
}

function streamChunks(text: string): AsyncIterable<string> {
  return (async function* () {
    yield text;
  })();
}

describe("Agent tool intent repair", () => {
  it("re-prompts for a tool call instead of saving planning text as a final assistant message", async () => {
    const sessionManager = new FakeSessionManager();
    const sessionId = "session-1";
    sessionManager.createSession(sessionId);

    const toolRegistry = new ToolRegistry();
    const shellExecute = vi.fn(async () => ({ output: "frigate is running" }));
    toolRegistry.register({
      name: "shell",
      description: "Run shell commands",
      parameters: {
        type: "object",
        properties: {
          cmd: { type: "string" },
        },
        required: ["cmd"],
      },
      execute: shellExecute,
    });

    const responses = [
      "I'll use the shell tool to check the Frigate container status first.",
      '```json\n{"tool":"shell","args":{"cmd":"docker ps --filter name=frigate"}}\n```',
      "Frigate is running.",
    ];
    const executeStream = vi.fn(async () => ({
      stream: streamChunks(responses.shift() ?? "Frigate is running."),
      metadata: {
        provider: "fake-provider",
        model: "fake-model",
      },
    }));

    const agent = new Agent(
      sessionManager as any,
      { logUsage: vi.fn() } as any,
      {
        executeStream,
      } as any,
      {
        prune: (messages: any[]) => messages,
      } as any,
      toolRegistry,
      undefined,
      { maxTurns: 6 },
    );

    const result = await agent.runStep(sessionId, "What is the status of Frigate?");
    const saved = sessionManager.getSession(sessionId)?.messages ?? [];

    expect(result).toBe("Frigate is running.");
    expect(executeStream).toHaveBeenCalledTimes(3);
    expect(shellExecute).toHaveBeenCalledWith(
      { cmd: "docker ps --filter name=frigate" },
      expect.objectContaining({ sessionId }),
    );
    expect(
      saved.some(
        (message) =>
          message.role === "assistant"
          && typeof message.content === "string"
          && message.content.includes("I'll use the shell tool"),
      ),
    ).toBe(false);
    expect(
      saved.some(
        (message) =>
          message.role === "assistant"
          && typeof message.content === "string"
          && message.content.includes('"tool": "shell"'),
      ),
    ).toBe(true);
    expect(
      saved.some(
        (message) =>
          message.role === "user"
          && typeof message.content === "string"
          && message.content.includes("[Tool Output for shell]:"),
      ),
    ).toBe(true);
    expect(saved.at(-1)?.content).toBe("Frigate is running.");
  });

  it("emits a retry notification when the provider router reports a retry", async () => {
    const sessionManager = new FakeSessionManager();
    const sessionId = "session-retry";
    sessionManager.createSession(sessionId);

    const executeStream = vi.fn(async (_prompt, _model, options) => {
      options?.onRetry?.({
        attempt: 1,
        maxRetries: 2,
        provider: "openai-codex",
        model: "gpt-5.4",
        reason: "PROVIDER_TIMEOUT: first chunk timed out",
        delayMs: 2100,
      });
      return {
        stream: streamChunks("Recovered."),
        metadata: {
          provider: "openai-codex",
          model: "gpt-5.4",
        },
      };
    });

    const onStep = vi.fn();
    const agent = new Agent(
      sessionManager as any,
      { logUsage: vi.fn() } as any,
      { executeStream } as any,
      { prune: (messages: any[]) => messages } as any,
      new ToolRegistry(),
      undefined,
      { maxTurns: 3 },
    );

    const result = await agent.runStep(sessionId, "Ping", { onStep, runId: "run_retry" });

    expect(result).toBe("Recovered.");
    expect(
      onStep.mock.calls.some(
        ([message]) =>
          typeof message?.content === "string"
          && message.content.includes("openai-codex/gpt-5.4 retry 1/2"),
      ),
    ).toBe(true);
  });
});
