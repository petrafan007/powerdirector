import { afterEach, describe, expect, it } from "vitest";
import { DiagnosticsManager } from "./diagnostics.js";

const originalStateDir = process.env.POWERDIRECTOR_STATE_DIR;

afterEach(() => {
  if (originalStateDir === undefined) {
    delete process.env.POWERDIRECTOR_STATE_DIR;
    return;
  }
  process.env.POWERDIRECTOR_STATE_DIR = originalStateDir;
});

describe("DiagnosticsManager runtime storage", () => {
  it("defaults diagnostics traces outside the install repo", () => {
    process.env.POWERDIRECTOR_STATE_DIR = "/tmp/powerdirector-state-diagnostics";
    const manager = new DiagnosticsManager({ enabled: true }, "/repo/powerdirector");

    expect(manager.getStatus().otel.tracePath).toBe(
      "/tmp/powerdirector-state-diagnostics/diagnostics/otel.ndjson",
    );
    expect(manager.getStatus().cacheTrace.tracePath).toBe(
      "/tmp/powerdirector-state-diagnostics/diagnostics/cache-trace.ndjson",
    );
  });

  it("keeps explicit relative cacheTrace paths under the provided base dir", () => {
    process.env.POWERDIRECTOR_STATE_DIR = "/tmp/powerdirector-state-diagnostics";
    const manager = new DiagnosticsManager(
      {
        enabled: true,
        cacheTrace: {
          enabled: true,
          filePath: "custom/cache-trace.ndjson",
        },
      },
      "/repo/powerdirector",
    );

    expect(manager.getStatus().cacheTrace.tracePath).toBe(
      "/repo/powerdirector/custom/cache-trace.ndjson",
    );
  });
});
