import { afterEach, describe, expect, it, vi } from "vitest";

type LoggerModule = typeof import("./logger.js");

const originalGetBuiltinModule = (
  process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown }
).getBuiltinModule;

async function importBrowserSafeLogger(params?: {
  resolvePreferredPowerDirectorTmpDir?: ReturnType<typeof vi.fn>;
}): Promise<{
  module: LoggerModule;
  resolvePreferredPowerDirectorTmpDir: ReturnType<typeof vi.fn>;
}> {
  vi.resetModules();
  const resolvePreferredPowerDirectorTmpDir =
    params?.resolvePreferredPowerDirectorTmpDir ??
    vi.fn(() => {
      throw new Error("resolvePreferredPowerDirectorTmpDir should not run during browser-safe import");
    });

  vi.doMock("../infra/tmp-powerdirector-dir.js", async () => {
    const actual = await vi.importActual<typeof import("../infra/tmp-powerdirector-dir.js")>(
      "../infra/tmp-powerdirector-dir.js",
    );
    return {
      ...actual,
      resolvePreferredPowerDirectorTmpDir,
    };
  });

  Object.defineProperty(process, "getBuiltinModule", {
    configurable: true,
    value: undefined,
  });

  const module = await import("./logger.js");
  return { module, resolvePreferredPowerDirectorTmpDir };
}

describe("logging/logger browser-safe import", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../infra/tmp-powerdirector-dir.js");
    Object.defineProperty(process, "getBuiltinModule", {
      configurable: true,
      value: originalGetBuiltinModule,
    });
  });

  it("does not resolve the preferred temp dir at import time when node fs is unavailable", async () => {
    const { module, resolvePreferredPowerDirectorTmpDir } = await importBrowserSafeLogger();

    expect(resolvePreferredPowerDirectorTmpDir).not.toHaveBeenCalled();
    expect(module.DEFAULT_LOG_DIR).toBe("/tmp/powerdirector");
    expect(module.DEFAULT_LOG_FILE).toBe("/tmp/powerdirector/powerdirector.log");
  });

  it("disables file logging when imported in a browser-like environment", async () => {
    const { module, resolvePreferredPowerDirectorTmpDir } = await importBrowserSafeLogger();

    expect(module.getResolvedLoggerSettings()).toMatchObject({
      level: "silent",
      file: "/tmp/powerdirector/powerdirector.log",
    });
    expect(module.isFileLogLevelEnabled("info")).toBe(false);
    expect(() => module.getLogger().info("browser-safe")).not.toThrow();
    expect(resolvePreferredPowerDirectorTmpDir).not.toHaveBeenCalled();
  });
});
