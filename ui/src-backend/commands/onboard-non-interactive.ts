import { formatCliCommand } from '../cli/command-format';
import type { PowerDirectorConfig } from '../config/config';
import { readConfigFileSnapshot } from '../config/config';
import type { RuntimeEnv } from '../runtime';
import { defaultRuntime } from '../runtime';
import { runNonInteractiveOnboardingLocal } from './onboard-non-interactive/local';
import { runNonInteractiveOnboardingRemote } from './onboard-non-interactive/remote';
import type { OnboardOptions } from './onboard-types';

export async function runNonInteractiveOnboarding(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.exists && !snapshot.valid) {
    runtime.error(
      `Config invalid. Run \`${formatCliCommand("powerdirector doctor")}\` to repair it, then re-run onboarding.`,
    );
    runtime.exit(1);
    return;
  }

  const baseConfig: PowerDirectorConfig = snapshot.valid ? snapshot.config : {};
  const mode = opts.mode ?? "local";
  if (mode !== "local" && mode !== "remote") {
    runtime.error(`Invalid --mode "${String(mode)}" (use local|remote).`);
    runtime.exit(1);
    return;
  }

  if (mode === "remote") {
    await runNonInteractiveOnboardingRemote({ opts, runtime, baseConfig });
    return;
  }

  await runNonInteractiveOnboardingLocal({ opts, runtime, baseConfig });
}
