import { createNonExitingRuntime, type RuntimeEnv } from "@/src-backend/plugin-sdk/runtime-env";
import { normalizeStringEntries } from "@/src-backend/plugin-sdk/text-runtime";
import type { MonitorIMessageOpts } from "./types";

export function resolveRuntime(opts: MonitorIMessageOpts): RuntimeEnv {
  return opts.runtime ?? createNonExitingRuntime();
}

export function normalizeAllowList(list?: Array<string | number>) {
  return normalizeStringEntries(list);
}
