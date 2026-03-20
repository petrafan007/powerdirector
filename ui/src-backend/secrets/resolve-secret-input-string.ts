import type { PowerDirectorConfig } from "../config/config";
import {
  normalizeSecretInputString,
  resolveSecretInputRef,
  type SecretRef,
} from "../config/types.secrets";
import { resolveSecretRefString } from "./resolve";

type SecretDefaults = NonNullable<PowerDirectorConfig["secrets"]>["defaults"];

export async function resolveSecretInputString(params: {
  config: PowerDirectorConfig;
  value: unknown;
  env: NodeJS.ProcessEnv;
  defaults?: SecretDefaults;
  normalize?: (value: unknown) => string | undefined;
  onResolveRefError?: (error: unknown, ref: SecretRef) => never;
}): Promise<string | undefined> {
  const normalize = params.normalize ?? normalizeSecretInputString;
  const { ref } = resolveSecretInputRef({
    value: params.value,
    defaults: params.defaults ?? params.config.secrets?.defaults,
  });
  if (!ref) {
    return normalize(params.value);
  }

  let resolved: string;
  try {
    resolved = await resolveSecretRefString(ref, {
      config: params.config,
      env: params.env,
    });
  } catch (error) {
    if (params.onResolveRefError) {
      return params.onResolveRefError(error, ref);
    }
    throw error;
  }
  return normalize(resolved);
}
