import type { PowerDirectorConfig } from '../../../config/config';
import type { RuntimeEnv } from '../../../runtime';
import type { OnboardOptions } from '../../onboard-types';

export function applyNonInteractiveSkillsConfig(params: {
  nextConfig: PowerDirectorConfig;
  opts: OnboardOptions;
  runtime: RuntimeEnv;
}) {
  const { nextConfig, opts, runtime } = params;
  if (opts.skipSkills) {
    return nextConfig;
  }

  const nodeManager = opts.nodeManager ?? "npm";
  if (!["npm", "pnpm", "bun"].includes(nodeManager)) {
    runtime.error("Invalid --node-manager (use npm, pnpm, or bun)");
    runtime.exit(1);
    return nextConfig;
  }
  return {
    ...nextConfig,
    skills: {
      ...nextConfig.skills,
      install: {
        ...nextConfig.skills?.install,
        nodeManager,
      },
    },
  };
}
