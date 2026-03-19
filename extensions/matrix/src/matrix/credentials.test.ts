import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearMatrixRuntime, setMatrixRuntime } from "../runtime.js";
import { loadMatrixCredentials, resolveMatrixCredentialsDir } from "./credentials.js";

describe("matrix credentials paths", () => {
  const previousStateDir = process.env.POWERDIRECTOR_STATE_DIR;

  beforeEach(() => {
    clearMatrixRuntime();
    delete process.env.POWERDIRECTOR_STATE_DIR;
  });

  afterEach(() => {
    clearMatrixRuntime();
    if (previousStateDir === undefined) {
      delete process.env.POWERDIRECTOR_STATE_DIR;
    } else {
      process.env.POWERDIRECTOR_STATE_DIR = previousStateDir;
    }
  });

  it("falls back to POWERDIRECTOR_STATE_DIR when runtime is not initialized", () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "powerdirector-matrix-creds-"));
    process.env.POWERDIRECTOR_STATE_DIR = stateDir;

    expect(resolveMatrixCredentialsDir(process.env)).toBe(
      path.join(stateDir, "credentials", "matrix"),
    );
  });

  it("prefers runtime state dir when runtime is initialized", () => {
    const runtimeStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "powerdirector-matrix-runtime-"));
    const envStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "powerdirector-matrix-env-"));
    process.env.POWERDIRECTOR_STATE_DIR = envStateDir;

    setMatrixRuntime({
      state: {
        resolveStateDir: () => runtimeStateDir,
      },
    } as never);

    expect(resolveMatrixCredentialsDir(process.env)).toBe(
      path.join(runtimeStateDir, "credentials", "matrix"),
    );
  });

  it("prefers explicit stateDir argument over runtime/env", () => {
    const explicitStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "powerdirector-matrix-explicit-"));
    const runtimeStateDir = fs.mkdtempSync(path.join(os.tmpdir(), "powerdirector-matrix-runtime-"));
    process.env.POWERDIRECTOR_STATE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "powerdirector-matrix-env-"));

    setMatrixRuntime({
      state: {
        resolveStateDir: () => runtimeStateDir,
      },
    } as never);

    expect(resolveMatrixCredentialsDir(process.env, explicitStateDir)).toBe(
      path.join(explicitStateDir, "credentials", "matrix"),
    );
  });

  it("returns null without throwing when credentials are missing and runtime is absent", () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "powerdirector-matrix-creds-missing-"));
    process.env.POWERDIRECTOR_STATE_DIR = stateDir;

    expect(() => loadMatrixCredentials(process.env)).not.toThrow();
    expect(loadMatrixCredentials(process.env)).toBeNull();
  });
});
