import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createConfigIO: vi.fn().mockReturnValue({
    configPath: "/tmp/powerdirector-dev/powerdirector.config.json",
  }),
}));

vi.mock("./io.js", () => ({
  createConfigIO: mocks.createConfigIO,
}));

import { formatConfigPath, logConfigUpdated } from "./logging.js";

describe("config logging", () => {
  it("formats the live config path when no explicit path is provided", () => {
    expect(formatConfigPath()).toBe("/tmp/powerdirector-dev/powerdirector.config.json");
  });

  it("logs the live config path when no explicit path is provided", () => {
    const runtime = { log: vi.fn() };
    logConfigUpdated(runtime as never);
    expect(runtime.log).toHaveBeenCalledWith("Updated /tmp/powerdirector-dev/powerdirector.config.json");
  });
});
