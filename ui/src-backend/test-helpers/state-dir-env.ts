import { captureEnv } from '../test-utils/env';

export function snapshotStateDirEnv() {
  return captureEnv(["POWERDIRECTOR_STATE_DIR", "CLAWDBOT_STATE_DIR"]);
}

export function restoreStateDirEnv(snapshot: ReturnType<typeof snapshotStateDirEnv>): void {
  snapshot.restore();
}

export function setStateDirEnv(stateDir: string): void {
  process.env.POWERDIRECTOR_STATE_DIR = stateDir;
  delete process.env.CLAWDBOT_STATE_DIR;
}
