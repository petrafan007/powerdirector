import { vi } from "vitest";

export function registerGetReplyCommonMocks(): void {
  vi.mock("../../agents/agent-scope", () => ({
    resolveAgentDir: vi.fn(() => "/tmp/agent"),
    resolveAgentWorkspaceDir: vi.fn(() => "/tmp/workspace"),
    resolveSessionAgentId: vi.fn(() => "main"),
    resolveAgentSkillsFilter: vi.fn(() => undefined),
  }));
  vi.mock("../../agents/model-selection", () => ({
    resolveModelRefFromString: vi.fn(() => null),
  }));
  vi.mock("../../agents/timeout", () => ({
    resolveAgentTimeoutMs: vi.fn(() => 60000),
  }));
  vi.mock("../../agents/workspace", () => ({
    DEFAULT_AGENT_WORKSPACE_DIR: "/tmp/workspace",
    ensureAgentWorkspace: vi.fn(async () => ({ dir: "/tmp/workspace" })),
  }));
  vi.mock("../../channels/model-overrides", () => ({
    resolveChannelModelOverride: vi.fn(() => undefined),
  }));
  vi.mock("../../config/config", () => ({
    loadConfig: vi.fn(() => ({})),
  }));
  vi.mock("../../runtime", () => ({
    defaultRuntime: { log: vi.fn() },
  }));
  vi.mock("../command-auth", () => ({
    resolveCommandAuthorization: vi.fn(() => ({ isAuthorizedSender: true })),
  }));
  vi.mock("./directive-handling", () => ({
    resolveDefaultModel: vi.fn(() => ({
      defaultProvider: "openai",
      defaultModel: "gpt-4o-mini",
      aliasIndex: new Map(),
    })),
  }));
  vi.mock("./get-reply-run", () => ({
    runPreparedReply: vi.fn(async () => undefined),
  }));
  vi.mock("./inbound-context", () => ({
    finalizeInboundContext: vi.fn((ctx: unknown) => ctx),
  }));
  vi.mock("./session-reset-model", () => ({
    applyResetModelOverride: vi.fn(async () => undefined),
  }));
  vi.mock("./stage-sandbox-media", () => ({
    stageSandboxMedia: vi.fn(async () => undefined),
  }));
  vi.mock("./typing", () => ({
    createTypingController: vi.fn(() => ({
      onReplyStart: async () => undefined,
      startTypingLoop: async () => undefined,
      startTypingOnText: async () => undefined,
      refreshTypingTtl: () => undefined,
      isActive: () => false,
      markRunComplete: () => undefined,
      markDispatchIdle: () => undefined,
      cleanup: () => undefined,
    })),
  }));
}
