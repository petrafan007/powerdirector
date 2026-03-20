import type { PowerDirectorConfig } from "../../../config/config";
import { resolveUserPath } from "../../../utils";
import type { OnboardOptions } from "../../onboard-types";

export function resolveNonInteractiveWorkspaceDir(params: {
  opts: OnboardOptions;
  baseConfig: PowerDirectorConfig;
  defaultWorkspaceDir: string;
}) {
  const raw = (
    params.opts.workspace ??
    params.baseConfig.agents?.defaults?.workspace ??
    params.defaultWorkspaceDir
  ).trim();
  return resolveUserPath(raw);
}
