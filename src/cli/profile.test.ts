import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "powerdirector",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "powerdirector", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "powerdirector", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "powerdirector", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "powerdirector", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "powerdirector", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "powerdirector", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "powerdirector", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "powerdirector", "--profile", "work", "--dev", "status"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".powerdirector-dev");
    expect(env.POWERDIRECTOR_PROFILE).toBe("dev");
    expect(env.POWERDIRECTOR_STATE_DIR).toBe(expectedStateDir);
    expect(env.POWERDIRECTOR_CONFIG_PATH).toBe(path.join(expectedStateDir, "powerdirector.config.json"));
    expect(env.POWERDIRECTOR_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      POWERDIRECTOR_STATE_DIR: "/custom",
      POWERDIRECTOR_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.POWERDIRECTOR_STATE_DIR).toBe("/custom");
    expect(env.POWERDIRECTOR_GATEWAY_PORT).toBe("19099");
    expect(env.POWERDIRECTOR_CONFIG_PATH).toBe(path.join("/custom", "powerdirector.config.json"));
  });

  it("uses POWERDIRECTOR_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      POWERDIRECTOR_HOME: "/srv/powerdirector-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/powerdirector-home");
    expect(env.POWERDIRECTOR_STATE_DIR).toBe(path.join(resolvedHome, ".powerdirector-work"));
    expect(env.POWERDIRECTOR_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".powerdirector-work", "powerdirector.config.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "powerdirector doctor --fix",
      env: {},
      expected: "powerdirector doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "powerdirector doctor --fix",
      env: { POWERDIRECTOR_PROFILE: "default" },
      expected: "powerdirector doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "powerdirector doctor --fix",
      env: { POWERDIRECTOR_PROFILE: "Default" },
      expected: "powerdirector doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "powerdirector doctor --fix",
      env: { POWERDIRECTOR_PROFILE: "bad profile" },
      expected: "powerdirector doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "powerdirector --profile work doctor --fix",
      env: { POWERDIRECTOR_PROFILE: "work" },
      expected: "powerdirector --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "powerdirector --dev doctor",
      env: { POWERDIRECTOR_PROFILE: "dev" },
      expected: "powerdirector --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("powerdirector doctor --fix", { POWERDIRECTOR_PROFILE: "work" })).toBe(
      "powerdirector --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("powerdirector doctor --fix", { POWERDIRECTOR_PROFILE: "  jbpowerdirector  " })).toBe(
      "powerdirector --profile jbpowerdirector doctor --fix",
    );
  });

  it("handles command with no args after powerdirector", () => {
    expect(formatCliCommand("powerdirector", { POWERDIRECTOR_PROFILE: "test" })).toBe(
      "powerdirector --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm powerdirector doctor", { POWERDIRECTOR_PROFILE: "work" })).toBe(
      "pnpm powerdirector --profile work doctor",
    );
  });
});
