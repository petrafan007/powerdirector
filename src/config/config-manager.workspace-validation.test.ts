import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigManager } from "./config-manager.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe("ConfigManager workspace validation", () => {
  it("rejects section updates that place the workspace inside the checkout", async () => {
    const repoRoot = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), "powerdirector-config-manager-"));
    await fs.mkdir(path.join(repoRoot, ".git"));
    await fs.writeFile(path.join(repoRoot, "powerdirector.config.json"), "{}\n", "utf-8");
    process.chdir(repoRoot);

    const manager = new ConfigManager(repoRoot);
    const result = manager.updateSection("agents", {
      defaults: {
        workspace: path.join(repoRoot, "workspace"),
      },
    });

    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain("agents.defaults.workspace");
  });
});
