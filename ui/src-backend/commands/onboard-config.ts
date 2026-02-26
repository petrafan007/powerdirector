import type { PowerDirectorConfig } from '../config/config';

export function applyOnboardingLocalWorkspaceConfig(
  baseConfig: PowerDirectorConfig,
  workspaceDir: string,
): PowerDirectorConfig {
  return {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: {
        ...baseConfig.agents?.defaults,
        workspace: workspaceDir,
      },
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
  };
}
