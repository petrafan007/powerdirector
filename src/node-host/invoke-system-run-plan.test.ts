import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUN_SUBCOMMANDS,
  looksLikePathToken,
  resolveBunScriptOperandIndex,
  resolveDenoRunScriptOperandIndex,
  resolveOptionFilteredFileOperandIndex,
  resolveOptionFilteredPositionalIndex,
  resolvesToExistingFileSync,
} from "./invoke-system-run-plan.js";

// ---------------------------------------------------------------------------
// Helpers: mock fs.statSync so we can test without real files
// ---------------------------------------------------------------------------

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return { ...actual };
});

import fs from "node:fs";

let statSyncSpy: ReturnType<typeof vi.spyOn>;
const existingFiles = new Set<string>();

beforeEach(() => {
  existingFiles.clear();
  statSyncSpy = vi.spyOn(fs, "statSync").mockImplementation((filePath: unknown) => {
    const fp = String(filePath);
    const match = [...existingFiles].some((f) => fp.endsWith(f) || fp === f);
    if (match) {
      return { isFile: () => true } as ReturnType<typeof fs.statSync>;
    }
    throw new Error("ENOENT");
  });
});

afterEach(() => {
  statSyncSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// looksLikePathToken
// ---------------------------------------------------------------------------

describe("looksLikePathToken", () => {
  it("returns true for tokens starting with ./", () => {
    expect(looksLikePathToken("./run.ts")).toBe(true);
  });

  it("returns true for tokens starting with /", () => {
    expect(looksLikePathToken("/abs/path.ts")).toBe(true);
  });

  it("returns true for tokens with a file extension", () => {
    expect(looksLikePathToken("script.ts")).toBe(true);
    expect(looksLikePathToken("script.js")).toBe(true);
  });

  it("returns false for bare words without extension", () => {
    expect(looksLikePathToken("install")).toBe(false);
    expect(looksLikePathToken("test")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolvesToExistingFileSync
// ---------------------------------------------------------------------------

describe("resolvesToExistingFileSync", () => {
  it("returns true for a registered file", () => {
    existingFiles.add("/cwd/run.ts");
    expect(resolvesToExistingFileSync("run.ts", "/cwd")).toBe(true);
  });

  it("returns false for a missing file", () => {
    expect(resolvesToExistingFileSync("missing.ts", "/cwd")).toBe(false);
  });

  it("returns false for empty operand", () => {
    expect(resolvesToExistingFileSync("", "/cwd")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveOptionFilteredPositionalIndex
// ---------------------------------------------------------------------------

describe("resolveOptionFilteredPositionalIndex", () => {
  it("returns the index of the first positional token", () => {
    expect(
      resolveOptionFilteredPositionalIndex({
        argv: ["bun", "install"],
        startIndex: 1,
      }),
    ).toBe(1);
  });

  it("skips known options with values", () => {
    expect(
      resolveOptionFilteredPositionalIndex({
        argv: ["bun", "--config", "bunfig.toml", "run.ts"],
        startIndex: 1,
        optionsWithValue: new Set(["--config"]),
      }),
    ).toBe(3);
  });

  it("handles -- terminator correctly", () => {
    expect(
      resolveOptionFilteredPositionalIndex({
        argv: ["bun", "--", "run.ts"],
        startIndex: 1,
      }),
    ).toBe(2);
  });

  it("returns null for - (stdin)", () => {
    expect(
      resolveOptionFilteredPositionalIndex({
        argv: ["bun", "-"],
        startIndex: 1,
      }),
    ).toBeNull();
  });

  it("returns null when no positionals", () => {
    expect(
      resolveOptionFilteredPositionalIndex({
        argv: ["bun", "--flag"],
        startIndex: 1,
      }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveOptionFilteredFileOperandIndex
// ---------------------------------------------------------------------------

describe("resolveOptionFilteredFileOperandIndex", () => {
  it("returns null when file does not exist", () => {
    expect(
      resolveOptionFilteredFileOperandIndex({
        argv: ["deno", "run", "script.ts"],
        startIndex: 2,
        cwd: "/proj",
      }),
    ).toBeNull();
  });

  it("returns the index when file exists", () => {
    existingFiles.add("/proj/script.ts");
    expect(
      resolveOptionFilteredFileOperandIndex({
        argv: ["deno", "run", "script.ts"],
        startIndex: 2,
        cwd: "/proj",
      }),
    ).toBe(2);
  });

  it("returns null after -- when file does not exist", () => {
    expect(
      resolveOptionFilteredFileOperandIndex({
        argv: ["deno", "run", "--", "missing.ts"],
        startIndex: 2,
        cwd: "/proj",
      }),
    ).toBeNull();
  });

  it("returns the index after -- when file exists", () => {
    existingFiles.add("/proj/real.ts");
    expect(
      resolveOptionFilteredFileOperandIndex({
        argv: ["deno", "run", "--", "real.ts"],
        startIndex: 2,
        cwd: "/proj",
      }),
    ).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// resolveBunScriptOperandIndex
// ---------------------------------------------------------------------------

describe("resolveBunScriptOperandIndex", () => {
  it("returns null for known subcommands (install)", () => {
    expect(resolveBunScriptOperandIndex({ argv: ["bun", "install"], cwd: "/" })).toBeNull();
  });

  it("returns null for known subcommands (test)", () => {
    expect(resolveBunScriptOperandIndex({ argv: ["bun", "test"], cwd: "/" })).toBeNull();
  });

  it("verifies BUN_SUBCOMMANDS includes common entries", () => {
    expect(BUN_SUBCOMMANDS.has("install")).toBe(true);
    expect(BUN_SUBCOMMANDS.has("run")).toBe(true);
    expect(BUN_SUBCOMMANDS.has("add")).toBe(true);
  });

  it("returns null for bare word without extension (not path-like)", () => {
    expect(resolveBunScriptOperandIndex({ argv: ["bun", "myapp"], cwd: "/" })).toBeNull();
  });

  it("returns index for direct file (`bun ./run.ts`)", () => {
    existingFiles.add("/proj/run.ts");
    // ./run.ts looks like a path token AND resolves to a file
    const idx = resolveBunScriptOperandIndex({ argv: ["bun", "./run.ts"], cwd: "/proj" });
    expect(idx).toBe(1);
  });

  it("returns index for `bun run ./script.ts` after scanning past 'run'", () => {
    existingFiles.add("/proj/script.ts");
    const idx = resolveBunScriptOperandIndex({
      argv: ["bun", "run", "./script.ts"],
      cwd: "/proj",
    });
    expect(idx).toBe(2);
  });

  it("returns index for `bun run` with flag before file", () => {
    existingFiles.add("/proj/script.ts");
    const idx = resolveBunScriptOperandIndex({
      argv: ["bun", "run", "--hot", "./script.ts"],
      cwd: "/proj",
    });
    expect(idx).toBe(3);
  });

  it("returns null when bun run file does not exist", () => {
    const idx = resolveBunScriptOperandIndex({
      argv: ["bun", "run", "./missing.ts"],
      cwd: "/proj",
    });
    expect(idx).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveDenoRunScriptOperandIndex
// ---------------------------------------------------------------------------

describe("resolveDenoRunScriptOperandIndex", () => {
  it("returns null when second arg is not 'run'", () => {
    expect(resolveBunScriptOperandIndex({ argv: ["deno", "fmt"], cwd: "/" })).toBeNull();
    expect(resolveDenoRunScriptOperandIndex({ argv: ["deno", "fmt"], cwd: "/" })).toBeNull();
  });

  it("returns null when deno run file does not exist", () => {
    expect(
      resolveDenoRunScriptOperandIndex({
        argv: ["deno", "run", "script.ts"],
        cwd: "/proj",
      }),
    ).toBeNull();
  });

  it("returns the file index for `deno run script.ts`", () => {
    existingFiles.add("/proj/script.ts");
    expect(
      resolveDenoRunScriptOperandIndex({
        argv: ["deno", "run", "script.ts"],
        cwd: "/proj",
      }),
    ).toBe(2);
  });

  it("returns the file index past flags for `deno run --allow-net script.ts`", () => {
    existingFiles.add("/proj/script.ts");
    expect(
      resolveDenoRunScriptOperandIndex({
        argv: ["deno", "run", "--allow-net", "script.ts"],
        cwd: "/proj",
      }),
    ).toBe(3);
  });

  it("handles -- separator before script", () => {
    existingFiles.add("/proj/script.ts");
    expect(
      resolveDenoRunScriptOperandIndex({
        argv: ["deno", "run", "--", "script.ts"],
        cwd: "/proj",
      }),
    ).toBe(3);
  });
});
