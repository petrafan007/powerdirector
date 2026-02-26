import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverPowerDirectorPlugins } from './discovery';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = path.join(os.tmpdir(), `powerdirector-plugins-${randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

async function withStateDir<T>(stateDir: string, fn: () => Promise<T>) {
  const prev = process.env.POWERDIRECTOR_STATE_DIR;
  const prevBundled = process.env.POWERDIRECTOR_BUNDLED_PLUGINS_DIR;
  process.env.POWERDIRECTOR_STATE_DIR = stateDir;
  process.env.POWERDIRECTOR_BUNDLED_PLUGINS_DIR = "/nonexistent/bundled/plugins";
  try {
    return await fn();
  } finally {
    if (prev === undefined) {
      delete process.env.POWERDIRECTOR_STATE_DIR;
    } else {
      process.env.POWERDIRECTOR_STATE_DIR = prev;
    }
    if (prevBundled === undefined) {
      delete process.env.POWERDIRECTOR_BUNDLED_PLUGINS_DIR;
    } else {
      process.env.POWERDIRECTOR_BUNDLED_PLUGINS_DIR = prevBundled;
    }
  }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
});

describe("discoverPowerDirectorPlugins", () => {
  it("discovers global and workspace extensions", async () => {
    const stateDir = makeTempDir();
    const workspaceDir = path.join(stateDir, "workspace");

    const globalExt = path.join(stateDir, "extensions");
    fs.mkdirSync(globalExt, { recursive: true });
    fs.writeFileSync(path.join(globalExt, "alpha.ts"), "export default function () {}", "utf-8");

    const workspaceExt = path.join(workspaceDir, ".powerdirector", "extensions");
    fs.mkdirSync(workspaceExt, { recursive: true });
    fs.writeFileSync(path.join(workspaceExt, "beta.ts"), "export default function () {}", "utf-8");

    const { candidates } = await withStateDir(stateDir, async () => {
      return discoverPowerDirectorPlugins({ workspaceDir });
    });

    const ids = candidates.map((c) => c.idHint);
    expect(ids).toContain("alpha");
    expect(ids).toContain("beta");
  });

  it("loads package extension packs", async () => {
    const stateDir = makeTempDir();
    const globalExt = path.join(stateDir, "extensions", "pack");
    fs.mkdirSync(path.join(globalExt, "src"), { recursive: true });

    fs.writeFileSync(
      path.join(globalExt, "package.json"),
      JSON.stringify({
        name: "pack",
        powerdirector: { extensions: ["./src/one.ts", "./src/two.ts"] },
      }),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(globalExt, "src", "one.ts"),
      "export default function () {}",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(globalExt, "src", "two.ts"),
      "export default function () {}",
      "utf-8",
    );

    const { candidates } = await withStateDir(stateDir, async () => {
      return discoverPowerDirectorPlugins({});
    });

    const ids = candidates.map((c) => c.idHint);
    expect(ids).toContain("pack/one");
    expect(ids).toContain("pack/two");
  });

  it("derives unscoped ids for scoped packages", async () => {
    const stateDir = makeTempDir();
    const globalExt = path.join(stateDir, "extensions", "voice-call-pack");
    fs.mkdirSync(path.join(globalExt, "src"), { recursive: true });

    fs.writeFileSync(
      path.join(globalExt, "package.json"),
      JSON.stringify({
        name: "@powerdirector/voice-call",
        powerdirector: { extensions: ["./src/index.ts"] },
      }),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(globalExt, "src", "index.ts"),
      "export default function () {}",
      "utf-8",
    );

    const { candidates } = await withStateDir(stateDir, async () => {
      return discoverPowerDirectorPlugins({});
    });

    const ids = candidates.map((c) => c.idHint);
    expect(ids).toContain("voice-call");
  });

  it("treats configured directory paths as plugin packages", async () => {
    const stateDir = makeTempDir();
    const packDir = path.join(stateDir, "packs", "demo-plugin-dir");
    fs.mkdirSync(packDir, { recursive: true });

    fs.writeFileSync(
      path.join(packDir, "package.json"),
      JSON.stringify({
        name: "@powerdirector/demo-plugin-dir",
        powerdirector: { extensions: ["./index.js"] },
      }),
      "utf-8",
    );
    fs.writeFileSync(path.join(packDir, "index.js"), "module.exports = {}", "utf-8");

    const { candidates } = await withStateDir(stateDir, async () => {
      return discoverPowerDirectorPlugins({ extraPaths: [packDir] });
    });

    const ids = candidates.map((c) => c.idHint);
    expect(ids).toContain("demo-plugin-dir");
  });
  it("blocks extension entries that escape package directory", async () => {
    const stateDir = makeTempDir();
    const globalExt = path.join(stateDir, "extensions", "escape-pack");
    const outside = path.join(stateDir, "outside.js");
    fs.mkdirSync(globalExt, { recursive: true });

    fs.writeFileSync(
      path.join(globalExt, "package.json"),
      JSON.stringify({
        name: "@powerdirector/escape-pack",
        powerdirector: { extensions: ["../../outside.js"] },
      }),
      "utf-8",
    );
    fs.writeFileSync(outside, "export default function () {}", "utf-8");

    const result = await withStateDir(stateDir, async () => {
      return discoverPowerDirectorPlugins({});
    });

    expect(result.candidates).toHaveLength(0);
    expect(
      result.diagnostics.some((diag) => diag.message.includes("escapes package directory")),
    ).toBe(true);
  });

  it("rejects package extension entries that escape via symlink", async () => {
    const stateDir = makeTempDir();
    const globalExt = path.join(stateDir, "extensions", "pack");
    const outsideDir = path.join(stateDir, "outside");
    const linkedDir = path.join(globalExt, "linked");
    fs.mkdirSync(globalExt, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(path.join(outsideDir, "escape.ts"), "export default {}", "utf-8");
    try {
      fs.symlinkSync(outsideDir, linkedDir, process.platform === "win32" ? "junction" : "dir");
    } catch {
      return;
    }

    fs.writeFileSync(
      path.join(globalExt, "package.json"),
      JSON.stringify({
        name: "@powerdirector/pack",
        powerdirector: { extensions: ["./linked/escape.ts"] },
      }),
      "utf-8",
    );

    const { candidates, diagnostics } = await withStateDir(stateDir, async () => {
      return discoverPowerDirectorPlugins({});
    });

    expect(candidates.some((candidate) => candidate.idHint === "pack")).toBe(false);
    expect(diagnostics.some((entry) => entry.message.includes("escapes package directory"))).toBe(
      true,
    );
  });

  it.runIf(process.platform !== "win32")("blocks world-writable plugin paths", async () => {
    const stateDir = makeTempDir();
    const globalExt = path.join(stateDir, "extensions");
    fs.mkdirSync(globalExt, { recursive: true });
    const pluginPath = path.join(globalExt, "world-open.ts");
    fs.writeFileSync(pluginPath, "export default function () {}", "utf-8");
    fs.chmodSync(pluginPath, 0o777);

    const result = await withStateDir(stateDir, async () => {
      return discoverPowerDirectorPlugins({});
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.diagnostics.some((diag) => diag.message.includes("world-writable path"))).toBe(
      true,
    );
  });

  it.runIf(process.platform !== "win32" && typeof process.getuid === "function")(
    "blocks suspicious ownership when uid mismatch is detected",
    async () => {
      const stateDir = makeTempDir();
      const globalExt = path.join(stateDir, "extensions");
      fs.mkdirSync(globalExt, { recursive: true });
      fs.writeFileSync(
        path.join(globalExt, "owner-mismatch.ts"),
        "export default function () {}",
        "utf-8",
      );

      const actualUid = (process as NodeJS.Process & { getuid: () => number }).getuid();
      const result = await withStateDir(stateDir, async () => {
        return discoverPowerDirectorPlugins({ ownershipUid: actualUid + 1 });
      });
      expect(result.candidates).toHaveLength(0);
      expect(result.diagnostics.some((diag) => diag.message.includes("suspicious ownership"))).toBe(
        true,
      );
    },
  );
});
