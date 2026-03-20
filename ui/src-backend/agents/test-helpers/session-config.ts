import type { PowerDirectorConfig } from "../../config/config";

export function createPerSenderSessionConfig(
  overrides: Partial<NonNullable<PowerDirectorConfig["session"]>> = {},
): NonNullable<PowerDirectorConfig["session"]> {
  return {
    mainKey: "main",
    scope: "per-sender",
    ...overrides,
  };
}
