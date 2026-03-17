import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from './argv';

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
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
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
