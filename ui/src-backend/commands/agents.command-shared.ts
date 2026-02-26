import type { PowerDirectorConfig } from '../config/config';
import type { RuntimeEnv } from '../runtime';
import { requireValidConfigSnapshot } from './config-validation';

export function createQuietRuntime(runtime: RuntimeEnv): RuntimeEnv {
  return { ...runtime, log: () => {} };
}

export async function requireValidConfig(runtime: RuntimeEnv): Promise<PowerDirectorConfig | null> {
  return await requireValidConfigSnapshot(runtime);
}
