import { createNonExitingRuntime, type RuntimeEnv } from "../../runtime";
import { normalizeStringEntries } from "../../shared/string-normalization";
import type { MonitorIMessageOpts } from "./types";

export function resolveRuntime(opts: MonitorIMessageOpts): RuntimeEnv {
  return opts.runtime ?? createNonExitingRuntime();
}

export function normalizeAllowList(list?: Array<string | number>) {
  return normalizeStringEntries(list);
}
