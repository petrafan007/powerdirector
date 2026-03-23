import { createNonExitingRuntime, type RuntimeEnv } from "powerdirector/plugin-sdk/runtime-env";
import { normalizeStringEntries } from "powerdirector/plugin-sdk/text-runtime";
import type { MonitorIMessageOpts } from "./types";

export function resolveRuntime(opts: MonitorIMessageOpts): RuntimeEnv {
  return opts.runtime ?? createNonExitingRuntime();
}

export function normalizeAllowList(list?: Array<string | number>) {
  return normalizeStringEntries(list);
}
