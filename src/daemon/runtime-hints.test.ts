import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          POWERDIRECTOR_STATE_DIR: "/tmp/powerdirector-state",
          POWERDIRECTOR_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "powerdirector-gateway",
        windowsTaskName: "PowerDirector Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/powerdirector-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/powerdirector-state/logs/gateway.err.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        systemdServiceName: "powerdirector-gateway",
        windowsTaskName: "PowerDirector Gateway",
      }),
    ).toEqual(["Logs: journalctl --user -u powerdirector-gateway.service -n 200 --no-pager"]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        systemdServiceName: "powerdirector-gateway",
        windowsTaskName: "PowerDirector Gateway",
      }),
    ).toEqual(['Logs: schtasks /Query /TN "PowerDirector Gateway" /V /FO LIST']);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "powerdirector gateway install",
        startCommand: "powerdirector gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.powerdirector.gateway.plist",
        systemdServiceName: "powerdirector-gateway",
        windowsTaskName: "PowerDirector Gateway",
      }),
    ).toEqual([
      "powerdirector gateway install",
      "powerdirector gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.powerdirector.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "powerdirector gateway install",
        startCommand: "powerdirector gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.powerdirector.gateway.plist",
        systemdServiceName: "powerdirector-gateway",
        windowsTaskName: "PowerDirector Gateway",
      }),
    ).toEqual([
      "powerdirector gateway install",
      "powerdirector gateway",
      "systemctl --user start powerdirector-gateway.service",
    ]);
  });
});
