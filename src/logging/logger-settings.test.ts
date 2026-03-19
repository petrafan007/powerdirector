import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { fallbackRequireMock, readLoggingConfigMock } = vi.hoisted(() => ({
  readLoggingConfigMock: vi.fn(() => undefined),
  fallbackRequireMock: vi.fn(() => {
    throw new Error("config fallback should not be used in this test");
  }),
}));

vi.mock("./config.js", () => ({
  readLoggingConfig: readLoggingConfigMock,
}));

vi.mock("./node-require.js", () => ({
  resolveNodeRequireFromMeta: () => fallbackRequireMock,
}));

let originalTestFileLog: string | undefined;
let originalPowerDirectorLogLevel: string | undefined;
let logging: typeof import("../logging.js");

beforeAll(async () => {
  logging = await import("../logging.js");
});

beforeEach(() => {
  originalTestFileLog = process.env.POWERDIRECTOR_TEST_FILE_LOG;
  originalPowerDirectorLogLevel = process.env.POWERDIRECTOR_LOG_LEVEL;
  delete process.env.POWERDIRECTOR_TEST_FILE_LOG;
  delete process.env.POWERDIRECTOR_LOG_LEVEL;
  readLoggingConfigMock.mockClear();
  fallbackRequireMock.mockClear();
  logging.resetLogger();
  logging.setLoggerOverride(null);
});

afterEach(() => {
  if (originalTestFileLog === undefined) {
    delete process.env.POWERDIRECTOR_TEST_FILE_LOG;
  } else {
    process.env.POWERDIRECTOR_TEST_FILE_LOG = originalTestFileLog;
  }
  if (originalPowerDirectorLogLevel === undefined) {
    delete process.env.POWERDIRECTOR_LOG_LEVEL;
  } else {
    process.env.POWERDIRECTOR_LOG_LEVEL = originalPowerDirectorLogLevel;
  }
  logging.resetLogger();
  logging.setLoggerOverride(null);
  vi.restoreAllMocks();
});

describe("getResolvedLoggerSettings", () => {
  it("uses a silent fast path in default Vitest mode without config reads", () => {
    const settings = logging.getResolvedLoggerSettings();
    expect(settings.level).toBe("silent");
    expect(readLoggingConfigMock).not.toHaveBeenCalled();
    expect(fallbackRequireMock).not.toHaveBeenCalled();
  });

  it("reads logging config when test file logging is explicitly enabled", () => {
    process.env.POWERDIRECTOR_TEST_FILE_LOG = "1";
    const settings = logging.getResolvedLoggerSettings();
    expect(settings.level).toBe("info");
  });
});
