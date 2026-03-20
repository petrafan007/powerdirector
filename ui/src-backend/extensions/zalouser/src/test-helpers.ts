import type { RuntimeEnv } from "../runtime-api";
import type { ResolvedZalouserAccount } from "./types";

export function createZalouserRuntimeEnv(): RuntimeEnv {
  return {
    log: () => {},
    error: () => {},
    exit: ((code: number): never => {
      throw new Error(`exit ${code}`);
    }) as RuntimeEnv["exit"],
  };
}

export function createDefaultResolvedZalouserAccount(
  overrides: Partial<ResolvedZalouserAccount> = {},
): ResolvedZalouserAccount {
  return {
    accountId: "default",
    profile: "default",
    name: "test",
    enabled: true,
    authenticated: true,
    config: {},
    ...overrides,
  };
}
