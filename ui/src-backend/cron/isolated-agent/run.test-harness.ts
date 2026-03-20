import { vi, type Mock } from "vitest";

type CronSessionEntry = {
  sessionId: string;
  updatedAt: number;
  systemSent: boolean;
  skillsSnapshot: unknown;
  model?: string;
  modelProvider?: string;
  [key: string]: unknown;
};

type CronSession = {
  storePath: string;
  store: Record<string, unknown>;
  sessionEntry: CronSessionEntry;
  systemSent: boolean;
  isNewSession: boolean;
  [key: string]: unknown;
};

function createMock(): Mock {
  return vi.fn();
}

export const buildWorkspaceSkillSnapshotMock = createMock();
export const resolveAgentConfigMock = createMock();
export const resolveAgentModelFallbacksOverrideMock = createMock();
export const resolveAgentSkillsFilterMock = createMock();
export const getModelRefStatusMock = createMock();
export const isCliProviderMock = createMock();
export const resolveAllowedModelRefMock = createMock();
export const resolveConfiguredModelRefMock = createMock();
export const resolveHooksGmailModelMock = createMock();
export const resolveThinkingDefaultMock = createMock();
export const runWithModelFallbackMock = createMock();
export const runEmbeddedPiAgentMock = createMock();
export const runCliAgentMock = createMock();
export const getCliSessionIdMock = createMock();
export const updateSessionStoreMock = createMock();
export const resolveCronSessionMock = createMock();
export const logWarnMock = createMock();
export const countActiveDescendantRunsMock = createMock();
export const listDescendantRunsForRequesterMock = createMock();
export const pickLastNonEmptyTextFromPayloadsMock = createMock();
export const resolveCronDeliveryPlanMock = createMock();
export const resolveDeliveryTargetMock = createMock();

vi.mock("../../agents/agent-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/agent-scope")>();
  return {
    ...actual,
    resolveAgentConfig: resolveAgentConfigMock,
    resolveAgentDir: vi.fn().mockReturnValue("/tmp/agent-dir"),
    resolveAgentModelFallbacksOverride: resolveAgentModelFallbacksOverrideMock,
    resolveAgentWorkspaceDir: vi.fn().mockReturnValue("/tmp/workspace"),
    resolveDefaultAgentId: vi.fn().mockReturnValue("default"),
    resolveAgentSkillsFilter: resolveAgentSkillsFilterMock,
  };
});

vi.mock("../../agents/skills", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/skills")>();
  return {
    ...actual,
    buildWorkspaceSkillSnapshot: buildWorkspaceSkillSnapshotMock,
  };
});

vi.mock("../../agents/skills/refresh", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/skills/refresh")>();
  return {
    ...actual,
    getSkillsSnapshotVersion: vi.fn().mockReturnValue(42),
  };
});

vi.mock("../../agents/workspace", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/workspace")>();
  return {
    ...actual,
    DEFAULT_IDENTITY_FILENAME: "IDENTITY.md",
    ensureAgentWorkspace: vi.fn().mockResolvedValue({ dir: "/tmp/workspace" }),
  };
});

vi.mock("../../agents/model-catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/model-catalog")>();
  return {
    ...actual,
    loadModelCatalog: vi.fn().mockResolvedValue({ models: [] }),
  };
});

vi.mock("../../agents/model-selection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/model-selection")>();
  return {
    ...actual,
    getModelRefStatus: getModelRefStatusMock,
    isCliProvider: isCliProviderMock,
    resolveAllowedModelRef: resolveAllowedModelRefMock,
    resolveConfiguredModelRef: resolveConfiguredModelRefMock,
    resolveHooksGmailModel: resolveHooksGmailModelMock,
    resolveThinkingDefault: resolveThinkingDefaultMock,
  };
});

vi.mock("../../agents/model-fallback", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/model-fallback")>();
  return {
    ...actual,
    runWithModelFallback: runWithModelFallbackMock,
  };
});

vi.mock("../../agents/pi-embedded", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/pi-embedded")>();
  return {
    ...actual,
    runEmbeddedPiAgent: runEmbeddedPiAgentMock,
  };
});

vi.mock("../../agents/context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/context")>();
  return {
    ...actual,
    lookupContextTokens: vi.fn().mockReturnValue(128000),
  };
});

vi.mock("../../agents/date-time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/date-time")>();
  return {
    ...actual,
    formatUserTime: vi.fn().mockReturnValue("2026-02-10 12:00"),
    resolveUserTimeFormat: vi.fn().mockReturnValue("24h"),
    resolveUserTimezone: vi.fn().mockReturnValue("UTC"),
  };
});

vi.mock("../../agents/timeout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/timeout")>();
  return {
    ...actual,
    resolveAgentTimeoutMs: vi.fn().mockReturnValue(60_000),
  };
});

vi.mock("../../agents/usage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/usage")>();
  return {
    ...actual,
    deriveSessionTotalTokens: vi.fn().mockReturnValue(30),
    hasNonzeroUsage: vi.fn().mockReturnValue(false),
  };
});

vi.mock("../../agents/subagent-announce", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/subagent-announce")>();
  return {
    ...actual,
    runSubagentAnnounceFlow: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("../../agents/subagent-registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/subagent-registry")>();
  return {
    ...actual,
    countActiveDescendantRuns: countActiveDescendantRunsMock,
    listDescendantRunsForRequester: listDescendantRunsForRequesterMock,
  };
});

vi.mock("../../agents/cli-runner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/cli-runner")>();
  return {
    ...actual,
    runCliAgent: runCliAgentMock,
  };
});

vi.mock("../../agents/cli-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/cli-session")>();
  return {
    ...actual,
    getCliSessionId: getCliSessionIdMock,
    setCliSessionId: vi.fn(),
  };
});

vi.mock("../../auto-reply/thinking", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../auto-reply/thinking")>();
  return {
    ...actual,
    normalizeThinkLevel: vi.fn().mockReturnValue(undefined),
    normalizeVerboseLevel: vi.fn().mockReturnValue("off"),
    supportsXHighThinking: vi.fn().mockReturnValue(false),
  };
});

vi.mock("../../cli/outbound-send-deps", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../cli/outbound-send-deps")>();
  return {
    ...actual,
    createOutboundSendDeps: vi.fn().mockReturnValue({}),
  };
});

vi.mock("../../config/sessions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/sessions")>();
  return {
    ...actual,
    resolveAgentMainSessionKey: vi.fn().mockReturnValue("main:default"),
    resolveSessionTranscriptPath: vi.fn().mockReturnValue("/tmp/transcript.jsonl"),
    setSessionRuntimeModel: vi.fn(),
    updateSessionStore: updateSessionStoreMock,
  };
});

vi.mock("../../routing/session-key", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../routing/session-key")>();
  return {
    ...actual,
    buildAgentMainSessionKey: vi.fn().mockReturnValue("agent:default:cron:test"),
    normalizeAgentId: vi.fn((id: string) => id),
  };
});

vi.mock("../../infra/agent-events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../infra/agent-events")>();
  return {
    ...actual,
    registerAgentRunContext: vi.fn(),
  };
});

vi.mock("../../infra/outbound/deliver", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../infra/outbound/deliver")>();
  return {
    ...actual,
    deliverOutboundPayloads: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../../infra/skills-remote", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../infra/skills-remote")>();
  return {
    ...actual,
    getRemoteSkillEligibility: vi.fn().mockReturnValue({}),
  };
});

vi.mock("../../logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../logger")>();
  return {
    ...actual,
    logWarn: (...args: unknown[]) => logWarnMock(...args),
  };
});

vi.mock("../../security/external-content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../security/external-content")>();
  return {
    ...actual,
    buildSafeExternalPrompt: vi.fn().mockReturnValue("safe prompt"),
    detectSuspiciousPatterns: vi.fn().mockReturnValue([]),
    getHookType: vi.fn().mockReturnValue("unknown"),
    isExternalHookSession: vi.fn().mockReturnValue(false),
  };
});

vi.mock("../delivery", () => ({
  resolveCronDeliveryPlan: resolveCronDeliveryPlanMock,
}));

vi.mock("./delivery-target", () => ({
  resolveDeliveryTarget: resolveDeliveryTargetMock,
}));

vi.mock("./helpers", () => ({
  isHeartbeatOnlyResponse: vi.fn().mockReturnValue(false),
  pickLastDeliverablePayload: vi.fn().mockReturnValue(undefined),
  pickLastNonEmptyTextFromPayloads: pickLastNonEmptyTextFromPayloadsMock,
  pickSummaryFromOutput: vi.fn().mockReturnValue("summary"),
  pickSummaryFromPayloads: vi.fn().mockReturnValue("summary"),
  resolveHeartbeatAckMaxChars: vi.fn().mockReturnValue(100),
}));

vi.mock("./session", () => ({
  resolveCronSession: resolveCronSessionMock,
}));

vi.mock("../../agents/defaults", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../agents/defaults")>();
  return {
    ...actual,
    DEFAULT_CONTEXT_TOKENS: 128000,
    DEFAULT_MODEL: "gpt-4",
    DEFAULT_PROVIDER: "openai",
  };
});

export function makeCronSessionEntry(overrides?: Record<string, unknown>): CronSessionEntry {
  return {
    sessionId: "test-session-id",
    updatedAt: 0,
    systemSent: false,
    skillsSnapshot: undefined,
    ...overrides,
  };
}

export function makeCronSession(overrides?: Record<string, unknown>): CronSession {
  return {
    storePath: "/tmp/store.json",
    store: {},
    sessionEntry: makeCronSessionEntry(),
    systemSent: false,
    isNewSession: true,
    ...overrides,
  } as CronSession;
}

function makeDefaultModelFallbackResult() {
  return {
    result: {
      payloads: [{ text: "test output" }],
      meta: { agentMeta: { usage: { input: 10, output: 20 } } },
    },
    provider: "openai",
    model: "gpt-4",
  };
}

function makeDefaultEmbeddedResult() {
  return {
    payloads: [{ text: "test output" }],
    meta: { agentMeta: { usage: { input: 10, output: 20 } } },
  };
}

export function mockRunCronFallbackPassthrough(): void {
  runWithModelFallbackMock.mockImplementation(async ({ provider, model, run }) => {
    const result = await run(provider, model);
    return { result, provider, model, attempts: [] };
  });
}

export function resetRunCronIsolatedAgentTurnHarness(): void {
  vi.clearAllMocks();

  buildWorkspaceSkillSnapshotMock.mockReturnValue({
    prompt: "<available_skills></available_skills>",
    resolvedSkills: [],
    version: 42,
  });
  resolveAgentConfigMock.mockReturnValue(undefined);
  resolveAgentModelFallbacksOverrideMock.mockReturnValue(undefined);
  resolveAgentSkillsFilterMock.mockReturnValue(undefined);

  resolveConfiguredModelRefMock.mockReturnValue({ provider: "openai", model: "gpt-4" });
  resolveAllowedModelRefMock.mockReturnValue({ ref: { provider: "openai", model: "gpt-4" } });
  resolveHooksGmailModelMock.mockReturnValue(null);
  resolveThinkingDefaultMock.mockReturnValue("off");
  getModelRefStatusMock.mockReturnValue({ allowed: false });
  isCliProviderMock.mockReturnValue(false);

  runWithModelFallbackMock.mockReset();
  runWithModelFallbackMock.mockResolvedValue(makeDefaultModelFallbackResult());
  runEmbeddedPiAgentMock.mockReset();
  runEmbeddedPiAgentMock.mockResolvedValue(makeDefaultEmbeddedResult());

  runCliAgentMock.mockReset();
  getCliSessionIdMock.mockReturnValue(undefined);

  updateSessionStoreMock.mockReset();
  updateSessionStoreMock.mockResolvedValue(undefined);

  resolveCronSessionMock.mockReset();
  resolveCronSessionMock.mockReturnValue(makeCronSession());

  countActiveDescendantRunsMock.mockReset();
  countActiveDescendantRunsMock.mockReturnValue(0);
  listDescendantRunsForRequesterMock.mockReset();
  listDescendantRunsForRequesterMock.mockReturnValue([]);
  pickLastNonEmptyTextFromPayloadsMock.mockReset();
  pickLastNonEmptyTextFromPayloadsMock.mockReturnValue("test output");
  resolveCronDeliveryPlanMock.mockReset();
  resolveCronDeliveryPlanMock.mockReturnValue({ requested: false, mode: "none" });
  resolveDeliveryTargetMock.mockReset();
  resolveDeliveryTargetMock.mockResolvedValue({
    channel: "discord",
    to: undefined,
    accountId: undefined,
    error: undefined,
  });

  logWarnMock.mockReset();
}

export function clearFastTestEnv(): string | undefined {
  const previousFastTestEnv = process.env.POWERDIRECTOR_TEST_FAST;
  delete process.env.POWERDIRECTOR_TEST_FAST;
  return previousFastTestEnv;
}

export function restoreFastTestEnv(previousFastTestEnv: string | undefined): void {
  if (previousFastTestEnv == null) {
    delete process.env.POWERDIRECTOR_TEST_FAST;
    return;
  }
  process.env.POWERDIRECTOR_TEST_FAST = previousFastTestEnv;
}

export async function loadRunCronIsolatedAgentTurn() {
  const { runCronIsolatedAgentTurn } = await import("./run");
  return runCronIsolatedAgentTurn;
}
