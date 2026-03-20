import type { PowerDirectorConfig } from "../config/config";
import { collectChannelConfigAssignments } from "./runtime-config-collectors-channels";
import { collectCoreConfigAssignments } from "./runtime-config-collectors-core";
import type { ResolverContext } from "./runtime-shared";

export function collectConfigAssignments(params: {
  config: PowerDirectorConfig;
  context: ResolverContext;
}): void {
  const defaults = params.context.sourceConfig.secrets?.defaults;

  collectCoreConfigAssignments({
    config: params.config,
    defaults,
    context: params.context,
  });

  collectChannelConfigAssignments({
    config: params.config,
    defaults,
    context: params.context,
  });
}
