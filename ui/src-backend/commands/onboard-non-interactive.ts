import { formatCliCommand } from "../cli/command-format";
import type { PowerDirectorConfig } from "../config/config";
import { readConfigFileSnapshot } from "../config/config";
import type { RuntimeEnv } from "../runtime";
import { defaultRuntime } from "../runtime";
import { runNonInteractiveLocalSetup } from "./onboard-non-interactive/local";
import { runNonInteractiveRemoteSetup } from "./onboard-non-interactive/remote";
import type { OnboardOptions } from "./onboard-types";

export async function runNonInteractiveSetup(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.exists && !snapshot.valid) {
    runtime.error(
      `Config invalid. Run \`${formatCliCommand("powerdirector doctor")}\` to repair it, then re-run setup.`,
    );
    runtime.exit(1);
    return;
  }

  const baseConfig: PowerDirectorConfig = snapshot.valid ? (snapshot.exists ? snapshot.config : {}) : {};
  const mode = opts.mode ?? "local";
  if (mode !== "local" && mode !== "remote") {
    runtime.error(`Invalid --mode "${String(mode)}" (use local|remote).`);
    runtime.exit(1);
    return;
  }

  if (mode === "remote") {
    await runNonInteractiveRemoteSetup({ opts, runtime, baseConfig });
    return;
  }

  await runNonInteractiveLocalSetup({ opts, runtime, baseConfig });
}
