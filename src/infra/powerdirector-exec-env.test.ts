import { describe, expect, it } from "vitest";
import {
  ensurePowerDirectorExecMarkerOnProcess,
  markPowerDirectorExecEnv,
  POWERDIRECTOR_CLI_ENV_VALUE,
  POWERDIRECTOR_CLI_ENV_VAR,
} from "./powerdirector-exec-env.js";

describe("markPowerDirectorExecEnv", () => {
  it("returns a cloned env object with the exec marker set", () => {
    const env = { PATH: "/usr/bin", POWERDIRECTOR_CLI: "0" };
    const marked = markPowerDirectorExecEnv(env);

    expect(marked).toEqual({
      PATH: "/usr/bin",
      POWERDIRECTOR_CLI: POWERDIRECTOR_CLI_ENV_VALUE,
    });
    expect(marked).not.toBe(env);
    expect(env.POWERDIRECTOR_CLI).toBe("0");
  });
});

describe("ensurePowerDirectorExecMarkerOnProcess", () => {
  it("mutates and returns the provided process env", () => {
    const env: NodeJS.ProcessEnv = { PATH: "/usr/bin" };

    expect(ensurePowerDirectorExecMarkerOnProcess(env)).toBe(env);
    expect(env[POWERDIRECTOR_CLI_ENV_VAR]).toBe(POWERDIRECTOR_CLI_ENV_VALUE);
  });

  it("defaults to mutating process.env when no env object is provided", () => {
    const previous = process.env[POWERDIRECTOR_CLI_ENV_VAR];
    delete process.env[POWERDIRECTOR_CLI_ENV_VAR];

    try {
      expect(ensurePowerDirectorExecMarkerOnProcess()).toBe(process.env);
      expect(process.env[POWERDIRECTOR_CLI_ENV_VAR]).toBe(POWERDIRECTOR_CLI_ENV_VALUE);
    } finally {
      if (previous === undefined) {
        delete process.env[POWERDIRECTOR_CLI_ENV_VAR];
      } else {
        process.env[POWERDIRECTOR_CLI_ENV_VAR] = previous;
      }
    }
  });
});
