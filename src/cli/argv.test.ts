import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getCommandPositionalsWithRootOptions,
  getCommandPathWithRootOptions,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  isRootHelpInvocation,
  isRootVersionInvocation,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it.each([
    {
      name: "help flag",
      argv: ["node", "powerdirector", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "powerdirector", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "powerdirector", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "powerdirector", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "powerdirector", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with log-level",
      argv: ["node", "powerdirector", "--log-level", "debug", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "powerdirector", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "powerdirector", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "powerdirector", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --version",
      argv: ["node", "powerdirector", "--version"],
      expected: true,
    },
    {
      name: "root -V",
      argv: ["node", "powerdirector", "-V"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "powerdirector", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "subcommand version flag",
      argv: ["node", "powerdirector", "status", "--version"],
      expected: false,
    },
    {
      name: "unknown root flag with version",
      argv: ["node", "powerdirector", "--unknown", "--version"],
      expected: false,
    },
  ])("detects root-only version invocations: $name", ({ argv, expected }) => {
    expect(isRootVersionInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --help",
      argv: ["node", "powerdirector", "--help"],
      expected: true,
    },
    {
      name: "root -h",
      argv: ["node", "powerdirector", "-h"],
      expected: true,
    },
    {
      name: "root --help with profile",
      argv: ["node", "powerdirector", "--profile", "work", "--help"],
      expected: true,
    },
    {
      name: "subcommand --help",
      argv: ["node", "powerdirector", "status", "--help"],
      expected: false,
    },
    {
      name: "help before subcommand token",
      argv: ["node", "powerdirector", "--help", "status"],
      expected: false,
    },
    {
      name: "help after -- terminator",
      argv: ["node", "powerdirector", "nodes", "run", "--", "git", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag before help",
      argv: ["node", "powerdirector", "--unknown", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag after help",
      argv: ["node", "powerdirector", "--help", "--unknown"],
      expected: false,
    },
  ])("detects root-only help invocations: $name", ({ argv, expected }) => {
    expect(isRootHelpInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "powerdirector", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "powerdirector", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "powerdirector", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it("extracts command path while skipping known root option values", () => {
    expect(
      getCommandPathWithRootOptions(
        ["node", "powerdirector", "--profile", "work", "--no-color", "config", "validate"],
        2,
      ),
    ).toEqual(["config", "validate"]);
  });

  it("extracts routed config get positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "powerdirector", "config", "get", "--log-level", "debug", "update.channel", "--json"],
        {
          commandPath: ["config", "get"],
          booleanFlags: ["--json"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("extracts routed config unset positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "powerdirector", "config", "unset", "--profile", "work", "update.channel"],
        {
          commandPath: ["config", "unset"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("returns null when routed command sees unknown options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "powerdirector", "config", "get", "--mystery", "value", "update.channel"],
        {
          commandPath: ["config", "get"],
          booleanFlags: ["--json"],
        },
      ),
    ).toBeNull();
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "powerdirector", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "powerdirector"],
      expected: null,
    },
    {
      name: "skips known root option values",
      argv: ["node", "powerdirector", "--log-level", "debug", "status"],
      expected: "status",
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "powerdirector", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "powerdirector", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "powerdirector", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "powerdirector", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "powerdirector", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "powerdirector", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "powerdirector", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "powerdirector", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "powerdirector", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "powerdirector", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "powerdirector", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "powerdirector", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "powerdirector", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "powerdirector", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("builds parse argv from raw args", () => {
    const cases = [
      {
        rawArgs: ["node", "powerdirector", "status"],
        expected: ["node", "powerdirector", "status"],
      },
      {
        rawArgs: ["node-22", "powerdirector", "status"],
        expected: ["node-22", "powerdirector", "status"],
      },
      {
        rawArgs: ["node-22.2.0.exe", "powerdirector", "status"],
        expected: ["node-22.2.0.exe", "powerdirector", "status"],
      },
      {
        rawArgs: ["node-22.2", "powerdirector", "status"],
        expected: ["node-22.2", "powerdirector", "status"],
      },
      {
        rawArgs: ["node-22.2.exe", "powerdirector", "status"],
        expected: ["node-22.2.exe", "powerdirector", "status"],
      },
      {
        rawArgs: ["/usr/bin/node-22.2.0", "powerdirector", "status"],
        expected: ["/usr/bin/node-22.2.0", "powerdirector", "status"],
      },
      {
        rawArgs: ["node24", "powerdirector", "status"],
        expected: ["node24", "powerdirector", "status"],
      },
      {
        rawArgs: ["/usr/bin/node24", "powerdirector", "status"],
        expected: ["/usr/bin/node24", "powerdirector", "status"],
      },
      {
        rawArgs: ["node24.exe", "powerdirector", "status"],
        expected: ["node24.exe", "powerdirector", "status"],
      },
      {
        rawArgs: ["nodejs", "powerdirector", "status"],
        expected: ["nodejs", "powerdirector", "status"],
      },
      {
        rawArgs: ["node-dev", "powerdirector", "status"],
        expected: ["node", "powerdirector", "node-dev", "powerdirector", "status"],
      },
      {
        rawArgs: ["powerdirector", "status"],
        expected: ["node", "powerdirector", "status"],
      },
      {
        rawArgs: ["bun", "src/entry.ts", "status"],
        expected: ["bun", "src/entry.ts", "status"],
      },
    ] as const;

    for (const testCase of cases) {
      const parsed = buildParseArgv({
        programName: "powerdirector",
        rawArgs: [...testCase.rawArgs],
      });
      expect(parsed).toEqual([...testCase.expected]);
    }
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "powerdirector",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "powerdirector", "status"]);
  });

  it("decides when to migrate state", () => {
    const nonMutatingArgv = [
      ["node", "powerdirector", "status"],
      ["node", "powerdirector", "health"],
      ["node", "powerdirector", "sessions"],
      ["node", "powerdirector", "config", "get", "update"],
      ["node", "powerdirector", "config", "unset", "update"],
      ["node", "powerdirector", "models", "list"],
      ["node", "powerdirector", "models", "status"],
      ["node", "powerdirector", "memory", "status"],
      ["node", "powerdirector", "agent", "--message", "hi"],
    ] as const;
    const mutatingArgv = [
      ["node", "powerdirector", "agents", "list"],
      ["node", "powerdirector", "message", "send"],
    ] as const;

    for (const argv of nonMutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(false);
    }
    for (const argv of mutatingArgv) {
      expect(shouldMigrateState([...argv])).toBe(true);
    }
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});
