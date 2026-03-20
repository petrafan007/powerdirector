import type { RuntimeEnv } from "../runtime";
import { defaultRuntime } from "../runtime";
import { restoreTerminalState } from "../terminal/restore";
import { createClackPrompter } from "../wizard/clack-prompter";
import { WizardCancelledError } from "../wizard/prompts";
import { runSetupWizard } from "../wizard/setup";
import type { OnboardOptions } from "./onboard-types";

export async function runInteractiveSetup(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const prompter = createClackPrompter();
  let exitCode: number | null = null;
  try {
    await runSetupWizard(opts, runtime, prompter);
  } catch (err) {
    if (err instanceof WizardCancelledError) {
      // Best practice: cancellation is not a successful completion.
      exitCode = 1;
      return;
    }
    throw err;
  } finally {
    // Keep stdin paused so non-daemon runs can exit cleanly (e.g. Docker setup).
    restoreTerminalState("setup finish", { resumeStdinIfPaused: false });
    if (exitCode !== null) {
      runtime.exit(exitCode);
    }
  }
}
