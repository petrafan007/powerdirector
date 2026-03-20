import {
  resolveSessionStoreTargets,
  type SessionStoreSelectionOptions,
  type SessionStoreTarget,
} from "../config/sessions";
import type { PowerDirectorConfig } from "../config/types.powerdirector";
import type { RuntimeEnv } from "../runtime";
export { resolveSessionStoreTargets, type SessionStoreSelectionOptions, type SessionStoreTarget };

export function resolveSessionStoreTargetsOrExit(params: {
  cfg: PowerDirectorConfig;
  opts: SessionStoreSelectionOptions;
  runtime: RuntimeEnv;
}): SessionStoreTarget[] | null {
  try {
    return resolveSessionStoreTargets(params.cfg, params.opts);
  } catch (error) {
    params.runtime.error(error instanceof Error ? error.message : String(error));
    params.runtime.exit(1);
    return null;
  }
}
