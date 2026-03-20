import { vi } from "vitest";
import type { MockFn } from "../../test-utils/vitest-mock-fn";

export const callGatewayMock = vi.fn() as unknown as MockFn;

vi.mock("../../gateway/call", () => ({
  callGateway: (opts: unknown) => callGatewayMock(opts),
}));

vi.mock("../agent-scope", () => ({
  resolveSessionAgentId: () => "agent-123",
}));
