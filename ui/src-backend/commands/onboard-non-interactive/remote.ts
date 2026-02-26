import { formatCliCommand } from '../../cli/command-format';
import type { PowerDirectorConfig } from '../../config/config';
import { writeConfigFile } from '../../config/config';
import { logConfigUpdated } from '../../config/logging';
import type { RuntimeEnv } from '../../runtime';
import { applyWizardMetadata } from '../onboard-helpers';
import type { OnboardOptions } from '../onboard-types';

export async function runNonInteractiveOnboardingRemote(params: {
  opts: OnboardOptions;
  runtime: RuntimeEnv;
  baseConfig: PowerDirectorConfig;
}) {
  const { opts, runtime, baseConfig } = params;
  const mode = "remote" as const;

  const remoteUrl = opts.remoteUrl?.trim();
  if (!remoteUrl) {
    runtime.error("Missing --remote-url for remote mode.");
    runtime.exit(1);
    return;
  }

  let nextConfig: PowerDirectorConfig = {
    ...baseConfig,
    gateway: {
      ...baseConfig.gateway,
      mode: "remote",
      remote: {
        url: remoteUrl,
        token: opts.remoteToken?.trim() || undefined,
      },
    },
  };
  nextConfig = applyWizardMetadata(nextConfig, { command: "onboard", mode });
  await writeConfigFile(nextConfig);
  logConfigUpdated(runtime);

  const payload = {
    mode,
    remoteUrl,
    auth: opts.remoteToken ? "token" : "none",
  };
  if (opts.json) {
    runtime.log(JSON.stringify(payload, null, 2));
  } else {
    runtime.log(`Remote gateway: ${remoteUrl}`);
    runtime.log(`Auth: ${payload.auth}`);
    runtime.log(
      `Tip: run \`${formatCliCommand("powerdirector configure --section web")}\` to store your Brave API key for web_search. Docs: https://docs.powerdirector.ai/tools/web`,
    );
  }
}
