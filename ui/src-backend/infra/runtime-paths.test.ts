import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDefaultDiagnosticsDir,
  resolveDefaultGeneratedDir,
  resolveDefaultMediaStorageDir,
  resolveDefaultTmpDir,
} from './runtime-paths';

describe("runtime path defaults", () => {
  it("derives mutable paths from the PowerDirector state dir by default", () => {
    const env = { HOME: "/home/tester" } as NodeJS.ProcessEnv;
    const homedir = () => "/home/tester";

    expect(resolveDefaultMediaStorageDir(env, homedir)).toBe("/home/tester/.powerdirector/media");
    expect(resolveDefaultDiagnosticsDir(env, homedir)).toBe(
      "/home/tester/.powerdirector/diagnostics",
    );
    expect(resolveDefaultGeneratedDir(env, homedir)).toBe(
      "/home/tester/.powerdirector/generated",
    );
    expect(resolveDefaultTmpDir(env, homedir)).toBe("/home/tester/.powerdirector/tmp");
  });

  it("respects an explicit state dir override", () => {
    const env = {
      HOME: "/home/tester",
      POWERDIRECTOR_STATE_DIR: "/srv/powerdirector-state",
    } as NodeJS.ProcessEnv;
    const homedir = () => "/home/tester";

    expect(resolveDefaultMediaStorageDir(env, homedir)).toBe("/srv/powerdirector-state/media");
    expect(resolveDefaultDiagnosticsDir(env, homedir)).toBe(
      "/srv/powerdirector-state/diagnostics",
    );
    expect(resolveDefaultGeneratedDir(env, homedir)).toBe(
      "/srv/powerdirector-state/generated",
    );
    expect(resolveDefaultTmpDir(env, homedir)).toBe("/srv/powerdirector-state/tmp");
  });
});
