import { resetSystemEventsForTest } from "@/src-backend/plugin-sdk/infra-runtime";
import { resetInboundDedupe } from "@/src-backend/plugin-sdk/reply-runtime";
import type { MockFn } from "@/src-backend/plugin-sdk/testing";
import { beforeEach, vi } from "vitest";
import type { SignalDaemonExitEvent, SignalDaemonHandle } from "./daemon";

type SignalToolResultTestMocks = {
  waitForTransportReadyMock: MockFn;
  sendMock: MockFn;
  replyMock: MockFn;
  updateLastRouteMock: MockFn;
  readAllowFromStoreMock: MockFn;
  upsertPairingRequestMock: MockFn;
  streamMock: MockFn;
  signalCheckMock: MockFn;
  signalRpcRequestMock: MockFn;
  spawnSignalDaemonMock: MockFn;
};

const waitForTransportReadyMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const sendMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const replyMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const updateLastRouteMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const readAllowFromStoreMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const upsertPairingRequestMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const streamMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const signalCheckMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const signalRpcRequestMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;
const spawnSignalDaemonMock = vi.hoisted(() => vi.fn()) as unknown as MockFn;

export function getSignalToolResultTestMocks(): SignalToolResultTestMocks {
  return {
    waitForTransportReadyMock,
    sendMock,
    replyMock,
    updateLastRouteMock,
    readAllowFromStoreMock,
    upsertPairingRequestMock,
    streamMock,
    signalCheckMock,
    signalRpcRequestMock,
    spawnSignalDaemonMock,
  };
}

export let config: Record<string, unknown> = {};

export function setSignalToolResultTestConfig(next: Record<string, unknown>) {
  config = next;
}

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

export function createMockSignalDaemonHandle(
  overrides: {
    stop?: MockFn;
    exited?: Promise<SignalDaemonExitEvent>;
    isExited?: () => boolean;
  } = {},
): SignalDaemonHandle {
  const stop = overrides.stop ?? (vi.fn() as unknown as MockFn);
  const exited = overrides.exited ?? new Promise<SignalDaemonExitEvent>(() => {});
  const isExited = overrides.isExited ?? (() => false);
  return {
    stop: stop as unknown as () => void,
    exited,
    isExited,
  };
}

vi.mock("@/src-backend/plugin-sdk/config-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src-backend/plugin-sdk/config-runtime")>();
  return {
    ...actual,
    loadConfig: () => config,
  };
});

vi.mock("@/src-backend/plugin-sdk/reply-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src-backend/plugin-sdk/reply-runtime")>();
  return {
    ...actual,
    getReplyFromConfig: (...args: unknown[]) => replyMock(...args),
  };
});

vi.mock("./send", () => ({
  sendMessageSignal: (...args: unknown[]) => sendMock(...args),
  sendTypingSignal: vi.fn().mockResolvedValue(true),
  sendReadReceiptSignal: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/src-backend/plugin-sdk/conversation-runtime", () => ({
  readChannelAllowFromStore: (...args: unknown[]) => readAllowFromStoreMock(...args),
  upsertChannelPairingRequest: (...args: unknown[]) => upsertPairingRequestMock(...args),
}));

vi.mock("@/src-backend/plugin-sdk/config-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src-backend/plugin-sdk/config-runtime")>();
  return {
    ...actual,
    resolveStorePath: vi.fn(() => "/tmp/powerdirector-sessions.json"),
    updateLastRoute: (...args: unknown[]) => updateLastRouteMock(...args),
    readSessionUpdatedAt: vi.fn(() => undefined),
    recordSessionMetaFromInbound: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./client", () => ({
  streamSignalEvents: (...args: unknown[]) => streamMock(...args),
  signalCheck: (...args: unknown[]) => signalCheckMock(...args),
  signalRpcRequest: (...args: unknown[]) => signalRpcRequestMock(...args),
}));

vi.mock("./daemon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./daemon")>();
  return {
    ...actual,
    spawnSignalDaemon: (...args: unknown[]) => spawnSignalDaemonMock(...args),
  };
});

vi.mock("@/src-backend/plugin-sdk/infra-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src-backend/plugin-sdk/infra-runtime")>();
  return {
    ...actual,
    waitForTransportReady: (...args: unknown[]) => waitForTransportReadyMock(...args),
  };
});

export function installSignalToolResultTestHooks() {
  beforeEach(() => {
    resetInboundDedupe();
    config = {
      messages: { responsePrefix: "PFX" },
      channels: {
        signal: { autoStart: false, dmPolicy: "open", allowFrom: ["*"] },
      },
    };

    sendMock.mockReset().mockResolvedValue(undefined);
    replyMock.mockReset();
    updateLastRouteMock.mockReset();
    streamMock.mockReset();
    signalCheckMock.mockReset().mockResolvedValue({});
    signalRpcRequestMock.mockReset().mockResolvedValue({});
    spawnSignalDaemonMock.mockReset().mockReturnValue(createMockSignalDaemonHandle());
    readAllowFromStoreMock.mockReset().mockResolvedValue([]);
    upsertPairingRequestMock.mockReset().mockResolvedValue({ code: "PAIRCODE", created: true });
    waitForTransportReadyMock.mockReset().mockResolvedValue(undefined);

    resetSystemEventsForTest();
  });
}
