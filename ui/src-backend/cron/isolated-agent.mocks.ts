import { vi } from "vitest";
import {
  makeIsolatedAgentJobFixture,
  makeIsolatedAgentParamsFixture,
} from "./isolated-agent/job-fixtures";

vi.mock("../agents/pi-embedded", () => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  runEmbeddedPiAgent: vi.fn(),
  resolveEmbeddedSessionLane: (key: string) => `session:${key.trim() || "main"}`,
}));

vi.mock("../agents/model-catalog", () => ({
  loadModelCatalog: vi.fn(),
}));

vi.mock("../agents/model-selection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../agents/model-selection")>();
  return {
    ...actual,
    isCliProvider: vi.fn(() => false),
  };
});

vi.mock("../agents/subagent-announce", () => ({
  runSubagentAnnounceFlow: vi.fn(),
}));

vi.mock("../gateway/call", () => ({
  callGateway: vi.fn(),
}));

export const makeIsolatedAgentJob = makeIsolatedAgentJobFixture;
export const makeIsolatedAgentParams = makeIsolatedAgentParamsFixture;
