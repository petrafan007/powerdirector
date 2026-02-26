import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";

export function loadDotEnv(opts?: { quiet?: boolean }) {
  const quiet = opts?.quiet ?? true;

  // Load from process CWD first (dotenv default).
  dotenv.config({ quiet });

  // Resolve global fallback path manually to avoid circular dependency with utils.js/CONFIG_DIR.
  const env = process.env;
  const stateOverride = env.POWERDIRECTOR_STATE_DIR?.trim() || env.CLAWDBOT_STATE_DIR?.trim();
  const configDir = stateOverride
    ? (stateOverride.startsWith("~") ? path.join(os.homedir(), stateOverride.slice(1)) : path.resolve(stateOverride))
    : path.join(os.homedir(), ".powerdirector");

  const globalEnvPath = path.join(configDir, ".env");
  if (!fs.existsSync(globalEnvPath)) {
    return;
  }

  dotenv.config({ quiet, path: globalEnvPath, override: false });
}
