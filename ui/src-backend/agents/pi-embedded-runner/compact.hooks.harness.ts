import { vi, type Mock } from "vitest";

type MockResolvedModel = {
  model: { provider: string; api: string; id: string; input: unknown[] };
  error: null;
  authStorage: { setRuntimeApiKey: Mock<(provider?: string, apiKey?: string) => void> };
  modelRegistry: Record<string, never>;
};
type MockMemorySearchManager = {
  manager: {
    sync: (params?: unknown) => Promise<void>;
  };
};

export const contextEngineCompactMock = vi.fn(async () => ({
  ok: true as boolean,
  compacted: true as boolean,
  reason: undefined as string | undefined,
  result: { summary: "engine-summary", tokensAfter: 50 } as
    | { summary: string; tokensAfter: number }
    | undefined,
}));

export const hookRunner = {
  hasHooks: vi.fn<(hookName?: string) => boolean>(),
  runBeforeCompaction: vi.fn(async () => undefined),
  runAfterCompaction: vi.fn(async () => undefined),
};

export const ensureRuntimePluginsLoaded: Mock<(params?: unknown) => void> = vi.fn();
export const resolveContextEngineMock = vi.fn(async () => ({
  info: { ownsCompaction: true as boolean },
  compact: contextEngineCompactMock,
}));
export const resolveModelMock: Mock<
  (provider?: string, modelId?: string, agentDir?: string, cfg?: unknown) => MockResolvedModel
> = vi.fn((_provider?: string, _modelId?: string, _agentDir?: string, _cfg?: unknown) => ({
  model: { provider: "openai", api: "responses", id: "fake", input: [] },
  error: null,
  authStorage: { setRuntimeApiKey: vi.fn() },
  modelRegistry: {},
}));
export const sessionCompactImpl = vi.fn(async () => ({
  summary: "summary",
  firstKeptEntryId: "entry-1",
  tokensBefore: 120,
  details: { ok: true },
}));
export const triggerInternalHook: Mock<(event?: unknown) => void> = vi.fn();
export const sanitizeSessionHistoryMock = vi.fn(
  async (params: { messages: unknown[] }) => params.messages,
);
export const getMemorySearchManagerMock: Mock<
  (params?: unknown) => Promise<MockMemorySearchManager>
> = vi.fn(async () => ({
  manager: {
    sync: vi.fn(async (_params?: unknown) => {}),
  },
}));
export const resolveMemorySearchConfigMock = vi.fn(() => ({
  sources: ["sessions"],
  sync: {
    sessions: {
      postCompactionForce: true,
    },
  },
}));
export const resolveSessionAgentIdMock = vi.fn(() => "main");
export const estimateTokensMock = vi.fn((_message?: unknown) => 10);
export const sessionAbortCompactionMock: Mock<(reason?: unknown) => void> = vi.fn();
export const createPowerDirectorCodingToolsMock = vi.fn(() => []);

export function resetCompactHooksHarnessMocks(): void {
  hookRunner.hasHooks.mockReset();
  hookRunner.hasHooks.mockReturnValue(false);
  hookRunner.runBeforeCompaction.mockReset();
  hookRunner.runBeforeCompaction.mockResolvedValue(undefined);
  hookRunner.runAfterCompaction.mockReset();
  hookRunner.runAfterCompaction.mockResolvedValue(undefined);

  ensureRuntimePluginsLoaded.mockReset();

  resolveContextEngineMock.mockReset();
  resolveContextEngineMock.mockResolvedValue({
    info: { ownsCompaction: true },
    compact: contextEngineCompactMock,
  });
  contextEngineCompactMock.mockReset();
  contextEngineCompactMock.mockResolvedValue({
    ok: true,
    compacted: true,
    reason: undefined,
    result: { summary: "engine-summary", tokensAfter: 50 },
  });

  resolveModelMock.mockReset();
  resolveModelMock.mockReturnValue({
    model: { provider: "openai", api: "responses", id: "fake", input: [] },
    error: null,
    authStorage: { setRuntimeApiKey: vi.fn() },
    modelRegistry: {},
  });

  sessionCompactImpl.mockReset();
  sessionCompactImpl.mockResolvedValue({
    summary: "summary",
    firstKeptEntryId: "entry-1",
    tokensBefore: 120,
    details: { ok: true },
  });

  triggerInternalHook.mockReset();
  sanitizeSessionHistoryMock.mockReset();
  sanitizeSessionHistoryMock.mockImplementation(async (params: { messages: unknown[] }) => {
    return params.messages;
  });

  getMemorySearchManagerMock.mockReset();
  getMemorySearchManagerMock.mockResolvedValue({
    manager: {
      sync: vi.fn(async () => {}),
    },
  });
  resolveMemorySearchConfigMock.mockReset();
  resolveMemorySearchConfigMock.mockReturnValue({
    sources: ["sessions"],
    sync: {
      sessions: {
        postCompactionForce: true,
      },
    },
  });
  resolveSessionAgentIdMock.mockReset();
  resolveSessionAgentIdMock.mockReturnValue("main");
  estimateTokensMock.mockReset();
  estimateTokensMock.mockReturnValue(10);
  sessionAbortCompactionMock.mockReset();
  createPowerDirectorCodingToolsMock.mockReset();
  createPowerDirectorCodingToolsMock.mockReturnValue([]);
}

export async function loadCompactHooksHarness(): Promise<{
  compactEmbeddedPiSessionDirect: typeof import("./compact").compactEmbeddedPiSessionDirect;
  compactEmbeddedPiSession: typeof import("./compact").compactEmbeddedPiSession;
  onSessionTranscriptUpdate: typeof import("../../sessions/transcript-events").onSessionTranscriptUpdate;
}> {
  resetCompactHooksHarnessMocks();
  vi.resetModules();

  vi.doMock("../../plugins/hook-runner-global", () => ({
    getGlobalHookRunner: () => hookRunner,
  }));

  vi.doMock("../runtime-plugins", () => ({
    ensureRuntimePluginsLoaded,
  }));

  vi.doMock("../../hooks/internal-hooks", async () => {
    const actual = await vi.importActual<typeof import("../../hooks/internal-hooks")>(
      "../../hooks/internal-hooks",
    );
    return {
      ...actual,
      triggerInternalHook,
    };
  });

  vi.doMock("@mariozechner/pi-ai/oauth", () => ({
    getOAuthApiKey: vi.fn(),
    getOAuthProviders: vi.fn(() => []),
  }));

  vi.doMock("@mariozechner/pi-coding-agent", () => ({
    AuthStorage: class AuthStorage {},
    ModelRegistry: class ModelRegistry {},
    createAgentSession: vi.fn(async () => {
      const session = {
        sessionId: "session-1",
        messages: [
          { role: "user", content: "hello", timestamp: 1 },
          { role: "assistant", content: [{ type: "text", text: "hi" }], timestamp: 2 },
          {
            role: "toolResult",
            toolCallId: "t1",
            toolName: "exec",
            content: [{ type: "text", text: "output" }],
            isError: false,
            timestamp: 3,
          },
        ],
        agent: {
          replaceMessages: vi.fn((messages: unknown[]) => {
            session.messages = [...(messages as typeof session.messages)];
          }),
          streamFn: vi.fn(),
        },
        compact: vi.fn(async () => {
          session.messages.splice(1);
          return await sessionCompactImpl();
        }),
        abortCompaction: sessionAbortCompactionMock,
        dispose: vi.fn(),
      };
      return { session };
    }),
    DefaultResourceLoader: class DefaultResourceLoader {},
    SessionManager: {
      open: vi.fn(() => ({})),
    },
    SettingsManager: {
      create: vi.fn(() => ({})),
    },
    estimateTokens: estimateTokensMock,
  }));

  vi.doMock("../session-tool-result-guard-wrapper", () => ({
    guardSessionManager: vi.fn(() => ({
      flushPendingToolResults: vi.fn(),
    })),
  }));

  vi.doMock("../pi-settings", () => ({
    ensurePiCompactionReserveTokens: vi.fn(),
    resolveCompactionReserveTokensFloor: vi.fn(() => 0),
  }));

  vi.doMock("../models-config", () => ({
    ensurePowerDirectorModelsJson: vi.fn(async () => {}),
  }));

  vi.doMock("../model-auth", () => ({
    applyLocalNoAuthHeaderOverride: vi.fn((model: unknown) => model),
    getApiKeyForModel: vi.fn(async () => ({ apiKey: "test", mode: "env" })),
    resolveModelAuthMode: vi.fn(() => "env"),
  }));

  vi.doMock("../sandbox", () => ({
    resolveSandboxContext: vi.fn(async () => null),
  }));

  vi.doMock("../session-file-repair", () => ({
    repairSessionFileIfNeeded: vi.fn(async () => {}),
  }));

  vi.doMock("../session-write-lock", () => ({
    acquireSessionWriteLock: vi.fn(async () => ({ release: vi.fn(async () => {}) })),
    resolveSessionLockMaxHoldFromTimeout: vi.fn(() => 0),
  }));

  vi.doMock("../../context-engine/index", () => ({
    ensureContextEnginesInitialized: vi.fn(),
    resolveContextEngine: resolveContextEngineMock,
  }));

  vi.doMock("../../process/command-queue", () => ({
    enqueueCommandInLane: vi.fn((_lane: unknown, task: () => unknown) => task()),
  }));

  vi.doMock("./lanes", () => ({
    resolveSessionLane: vi.fn(() => "test-session-lane"),
    resolveGlobalLane: vi.fn(() => "test-global-lane"),
  }));

  vi.doMock("../context-window-guard", () => ({
    resolveContextWindowInfo: vi.fn(() => ({ tokens: 128_000 })),
  }));

  vi.doMock("../bootstrap-files", () => ({
    makeBootstrapWarn: vi.fn(() => () => {}),
    resolveBootstrapContextForRun: vi.fn(async () => ({ contextFiles: [] })),
  }));

  vi.doMock("../docs-path", () => ({
    resolvePowerDirectorDocsPath: vi.fn(async () => undefined),
  }));

  vi.doMock("../channel-tools", () => ({
    listChannelSupportedActions: vi.fn(() => undefined),
    resolveChannelMessageToolHints: vi.fn(() => undefined),
  }));

  vi.doMock("../pi-tools", () => ({
    createPowerDirectorCodingTools: createPowerDirectorCodingToolsMock,
  }));

  vi.doMock("./google", () => ({
    logToolSchemasForGoogle: vi.fn(),
    sanitizeSessionHistory: sanitizeSessionHistoryMock,
    sanitizeToolsForGoogle: vi.fn(({ tools }: { tools: unknown[] }) => tools),
  }));

  vi.doMock("./tool-split", () => ({
    splitSdkTools: vi.fn(() => ({ builtInTools: [], customTools: [] })),
  }));

  vi.doMock("../transcript-policy", () => ({
    resolveTranscriptPolicy: vi.fn(() => ({
      allowSyntheticToolResults: false,
      validateGeminiTurns: false,
      validateAnthropicTurns: false,
    })),
  }));

  vi.doMock("./extensions", () => ({
    buildEmbeddedExtensionFactories: vi.fn(() => ({ factories: [] })),
  }));

  vi.doMock("./history", () => ({
    getDmHistoryLimitFromSessionKey: vi.fn(() => undefined),
    limitHistoryTurns: vi.fn((msgs: unknown[]) => msgs.slice(0, 2)),
  }));

  vi.doMock("../skills", () => ({
    applySkillEnvOverrides: vi.fn(() => () => {}),
    applySkillEnvOverridesFromSnapshot: vi.fn(() => () => {}),
    loadWorkspaceSkillEntries: vi.fn(() => []),
    resolveSkillsPromptForRun: vi.fn(() => undefined),
  }));

  vi.doMock("../agent-paths", () => ({
    resolvePowerDirectorAgentDir: vi.fn(() => "/tmp"),
  }));

  vi.doMock("../agent-scope", () => ({
    resolveSessionAgentId: resolveSessionAgentIdMock,
    resolveSessionAgentIds: vi.fn(() => ({ defaultAgentId: "main", sessionAgentId: "main" })),
  }));

  vi.doMock("../memory-search", () => ({
    resolveMemorySearchConfig: resolveMemorySearchConfigMock,
  }));

  vi.doMock("../../memory/index", () => ({
    getMemorySearchManager: getMemorySearchManagerMock,
  }));

  vi.doMock("../date-time", () => ({
    formatUserTime: vi.fn(() => ""),
    resolveUserTimeFormat: vi.fn(() => ""),
    resolveUserTimezone: vi.fn(() => ""),
  }));

  vi.doMock("../defaults", () => ({
    DEFAULT_MODEL: "fake-model",
    DEFAULT_PROVIDER: "openai",
    DEFAULT_CONTEXT_TOKENS: 128_000,
  }));

  vi.doMock("../utils", () => ({
    resolveUserPath: vi.fn((p: string) => p),
  }));

  vi.doMock("../../infra/machine-name", () => ({
    getMachineDisplayName: vi.fn(async () => "machine"),
  }));

  vi.doMock("../../config/channel-capabilities", () => ({
    resolveChannelCapabilities: vi.fn(() => undefined),
  }));

  vi.doMock("../../utils/message-channel", () => ({
    INTERNAL_MESSAGE_CHANNEL: "webchat",
    normalizeMessageChannel: vi.fn(() => undefined),
  }));

  vi.doMock("../pi-embedded-helpers", () => ({
    ensureSessionHeader: vi.fn(async () => {}),
    validateAnthropicTurns: vi.fn((m: unknown[]) => m),
    validateGeminiTurns: vi.fn((m: unknown[]) => m),
  }));

  vi.doMock("../pi-project-settings", () => ({
    createPreparedEmbeddedPiSettingsManager: vi.fn(() => ({
      getGlobalSettings: vi.fn(() => ({})),
    })),
  }));

  vi.doMock("./sandbox-info", () => ({
    buildEmbeddedSandboxInfo: vi.fn(() => undefined),
  }));

  vi.doMock("./model", () => ({
    buildModelAliasLines: vi.fn(() => []),
    resolveModel: resolveModelMock,
    resolveModelAsync: vi.fn(
      async (provider: string, modelId: string, agentDir?: string, cfg?: unknown) =>
        resolveModelMock(provider, modelId, agentDir, cfg),
    ),
  }));

  vi.doMock("./session-manager-cache", () => ({
    prewarmSessionFile: vi.fn(async () => {}),
    trackSessionManagerAccess: vi.fn(),
  }));

  vi.doMock("./system-prompt", () => ({
    applySystemPromptOverrideToSession: vi.fn(),
    buildEmbeddedSystemPrompt: vi.fn(() => ""),
    createSystemPromptOverride: vi.fn(() => () => ""),
  }));

  vi.doMock("./utils", () => ({
    describeUnknownError: vi.fn((err: unknown) => String(err)),
    mapThinkingLevel: vi.fn(() => "off"),
    resolveExecToolDefaults: vi.fn(() => undefined),
  }));

  const [compactModule, transcriptEvents] = await Promise.all([
    import("./compact"),
    import("../../sessions/transcript-events"),
  ]);

  return {
    ...compactModule,
    onSessionTranscriptUpdate: transcriptEvents.onSessionTranscriptUpdate,
  };
}
