import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectPackageManager } from "./detect-package-manager.js";

describe("detectPackageManager", () => {
  it("prefers packageManager from package.json when supported", async () => {
    const root = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), "powerdirector-detect-pm-"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ packageManager: "pnpm@10.8.1" }),
      "utf8",
    );
    await fs.writeFile(path.join(root, "package-lock.json"), "", "utf8");

    await expect(detectPackageManager(root)).resolves.toBe("pnpm");
  });

  it("falls back to lockfiles when package.json is missing or unsupported", async () => {
    const bunRoot = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), "powerdirector-detect-pm-"));
    await fs.writeFile(path.join(bunRoot, "bun.lock"), "", "utf8");
    await expect(detectPackageManager(bunRoot)).resolves.toBe("bun");

    const legacyBunRoot = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), "powerdirector-detect-pm-"));
    await fs.writeFile(path.join(legacyBunRoot, "bun.lockb"), "", "utf8");
    await expect(detectPackageManager(legacyBunRoot)).resolves.toBe("bun");

    const npmRoot = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), "powerdirector-detect-pm-"));
    await fs.writeFile(
      path.join(npmRoot, "package.json"),
      JSON.stringify({ packageManager: "yarn@4.0.0" }),
      "utf8",
    );
    await fs.writeFile(path.join(npmRoot, "package-lock.json"), "", "utf8");
    await expect(detectPackageManager(npmRoot)).resolves.toBe("npm");
  });

  it("returns null when no package manager markers exist", async () => {
    const root = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), "powerdirector-detect-pm-"));
    await fs.writeFile(path.join(root, "package.json"), "{not-json}", "utf8");

    await expect(detectPackageManager(root)).resolves.toBeNull();
  });
});
