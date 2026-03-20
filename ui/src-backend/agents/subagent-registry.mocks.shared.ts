import { vi } from "vitest";

const noop = () => {};

vi.mock("../gateway/call", () => ({
  callGateway: vi.fn(async () => ({
    status: "ok",
    startedAt: 111,
    endedAt: 222,
  })),
}));

vi.mock("../infra/agent-events", () => ({
  onAgentEvent: vi.fn(() => noop),
}));
