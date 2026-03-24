import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveConfigPathCandidate,
  resolveGatewayLockDir,
  resolveOAuthDir,
  resolveStateDir,
} from "./paths.js";

describe("config path resolver compatibility", () => {
  it("accepts a string homedir when deriving the default state dir", () => {
    expect(resolveStateDir({} as NodeJS.ProcessEnv, "/srv/powerdirector-home")).toBe(
      path.join("/srv/powerdirector-home", ".powerdirector"),
    );
  });

  it("accepts a string homedir when expanding POWERDIRECTOR_STATE_DIR", () => {
    const env = {
      POWERDIRECTOR_STATE_DIR: "~/custom-state",
    } as NodeJS.ProcessEnv;

    expect(resolveStateDir(env, "/srv/powerdirector-home")).toBe(
      path.join("/srv/powerdirector-home", "custom-state"),
    );
  });

  it("accepts a string homedir when resolving config and oauth paths", () => {
    const env = {
      POWERDIRECTOR_CONFIG_PATH: "~/.powerdirector/custom.json",
      POWERDIRECTOR_STATE_DIR: "/srv/powerdirector-state",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigPathCandidate(env, "/srv/powerdirector-home")).toBe(
      path.join("/srv/powerdirector-home", ".powerdirector", "custom.json"),
    );
    expect(resolveOAuthDir(env, "/srv/powerdirector-home")).toBe(
      path.join("/srv/powerdirector-state", "credentials"),
    );
  });

  it("accepts a string tmpdir when resolving the gateway lock dir", () => {
    expect(resolveGatewayLockDir("/tmp/powerdirector-locks")).toBe(
      path.join("/tmp/powerdirector-locks", "powerdirector-gateway-lock"),
    );
  });
});
