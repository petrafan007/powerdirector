import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const loadConfig = vi.fn(() => ({
  gateway: {
    auth: {
      token: "config-token",
    },
  },
}));
const readConfigFileSnapshot = vi.fn(async () => ({
  exists: true,
  valid: true,
  config: {},
  issues: [],
}));

const runtimeLogs: string[] = [];
const defaultRuntime = {
  log: (message: string) => runtimeLogs.push(message),
  error: vi.fn(),
  exit: (code: number) => {
    throw new Error(`__exit__:${code}`);
  },
};

const service = {
  label: "TestService",
  loadedText: "loaded",
  notLoadedText: "not loaded",
  install: vi.fn(),
  uninstall: vi.fn(),
  stop: vi.fn(),
  isLoaded: vi.fn(),
  readCommand: vi.fn(),
  readRuntime: vi.fn(),
  restart: vi.fn(),
};

vi.mock("../../config/config.js", () => ({
  loadConfig: () => loadConfig(),
  readConfigFileSnapshot: () => readConfigFileSnapshot(),
}));

vi.mock("../../runtime.js", () => ({
  defaultRuntime,
}));

let runServiceRestart: typeof import("./lifecycle-core.js").runServiceRestart;
let runServiceStart: typeof import("./lifecycle-core.js").runServiceStart;

describe("runServiceRestart token drift", () => {
  beforeAll(async () => {
    ({ runServiceRestart, runServiceStart } = await import("./lifecycle-core.js"));
  });

  beforeEach(() => {
    runtimeLogs.length = 0;
    loadConfig.mockClear();
    readConfigFileSnapshot.mockReset();
    readConfigFileSnapshot.mockResolvedValue({
      exists: true,
      valid: true,
      config: {},
      issues: [],
    });
    service.isLoaded.mockClear();
    service.readCommand.mockClear();
    service.restart.mockClear();
    service.isLoaded.mockResolvedValue(true);
    service.readCommand.mockResolvedValue({
      environment: { POWERDIRECTOR_GATEWAY_TOKEN: "service-token" },
    });
    service.restart.mockResolvedValue(undefined);
    vi.unstubAllEnvs();
    vi.stubEnv("POWERDIRECTOR_GATEWAY_TOKEN", "");
    vi.stubEnv("CLAWDBOT_GATEWAY_TOKEN", "");
  });

  it("emits drift warning when enabled", async () => {
    await runServiceRestart({
      serviceNoun: "Gateway",
      service,
      renderStartHints: () => [],
      opts: { json: true },
      checkTokenDrift: true,
    });

    expect(loadConfig).toHaveBeenCalledTimes(1);
    const jsonLine = runtimeLogs.find((line) => line.trim().startsWith("{"));
    const payload = JSON.parse(jsonLine ?? "{}") as { warnings?: string[] };
    expect(payload.warnings?.[0]).toContain("gateway install --force");
  });

  it("skips drift warning when disabled", async () => {
    await runServiceRestart({
      serviceNoun: "Node",
      service,
      renderStartHints: () => [],
      opts: { json: true },
    });

    expect(loadConfig).not.toHaveBeenCalled();
    expect(service.readCommand).not.toHaveBeenCalled();
    const jsonLine = runtimeLogs.find((line) => line.trim().startsWith("{"));
    const payload = JSON.parse(jsonLine ?? "{}") as { warnings?: string[] };
    expect(payload.warnings).toBeUndefined();
  });

  it("aborts restart when config validation fails", async () => {
    readConfigFileSnapshot.mockResolvedValue({
      exists: true,
      valid: false,
      config: {},
      issues: [{ path: "gateway.auth.mode", message: "Required" }],
    });

    await expect(
      runServiceRestart({
        serviceNoun: "Gateway",
        service,
        renderStartHints: () => [],
        opts: { json: true },
      }),
    ).rejects.toThrow("__exit__:1");

    expect(service.restart).not.toHaveBeenCalled();
  });

  it("aborts start when config validation fails", async () => {
    readConfigFileSnapshot.mockResolvedValue({
      exists: true,
      valid: false,
      config: {},
      issues: [{ path: "gateway.auth.mode", message: "Required" }],
    });

    await expect(
      runServiceStart({
        serviceNoun: "Gateway",
        service,
        renderStartHints: () => [],
        opts: { json: true },
      }),
    ).rejects.toThrow("__exit__:1");

    expect(service.restart).not.toHaveBeenCalled();
  });
});
