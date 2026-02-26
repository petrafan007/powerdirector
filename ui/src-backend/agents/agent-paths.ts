import path from "node:path";
import { resolveStateDir } from '../config/paths';
import { DEFAULT_AGENT_ID } from '../routing/session-key';
import { resolveUserPath } from '../utils';

export function resolvePowerDirectorAgentDir(): string {
  const override =
    process.env.POWERDIRECTOR_AGENT_DIR?.trim() || process.env.PI_CODING_AGENT_DIR?.trim();
  if (override) {
    return resolveUserPath(override);
  }
  const defaultAgentDir = path.join(resolveStateDir(), "agents", DEFAULT_AGENT_ID, "agent");
  return resolveUserPath(defaultAgentDir);
}

export function ensurePowerDirectorAgentEnv(): string {
  const dir = resolvePowerDirectorAgentDir();
  if (!process.env.POWERDIRECTOR_AGENT_DIR) {
    process.env.POWERDIRECTOR_AGENT_DIR = dir;
  }
  if (!process.env.PI_CODING_AGENT_DIR) {
    process.env.PI_CODING_AGENT_DIR = dir;
  }
  return dir;
}
