import { OPENCODE_ZEN_DEFAULT_MODEL_REF } from '../agents/opencode-zen-models';
import type { PowerDirectorConfig } from '../config/config';
import { applyAgentDefaultModelPrimary } from './onboard-auth.config-shared';

export function applyOpencodeZenProviderConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  // Use the built-in opencode provider from pi-ai; only seed the allowlist alias.
  const models = { ...cfg.agents?.defaults?.models };
  models[OPENCODE_ZEN_DEFAULT_MODEL_REF] = {
    ...models[OPENCODE_ZEN_DEFAULT_MODEL_REF],
    alias: models[OPENCODE_ZEN_DEFAULT_MODEL_REF]?.alias ?? "Opus",
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
  };
}

export function applyOpencodeZenConfig(cfg: PowerDirectorConfig): PowerDirectorConfig {
  const next = applyOpencodeZenProviderConfig(cfg);
  return applyAgentDefaultModelPrimary(next, OPENCODE_ZEN_DEFAULT_MODEL_REF);
}
