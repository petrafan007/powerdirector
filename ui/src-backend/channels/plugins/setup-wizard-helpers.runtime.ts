import type { promptResolvedAllowFrom as promptResolvedAllowFromType } from "./setup-wizard-helpers";

export async function promptResolvedAllowFrom(
  ...args: Parameters<typeof promptResolvedAllowFromType>
): ReturnType<typeof promptResolvedAllowFromType> {
  const runtime = await import("./setup-wizard-helpers");
  return runtime.promptResolvedAllowFrom(...args);
}
