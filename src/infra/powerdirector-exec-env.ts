export const POWERDIRECTOR_CLI_ENV_VAR = "POWERDIRECTOR_CLI";
export const POWERDIRECTOR_CLI_ENV_VALUE = "1";

export function markPowerDirectorExecEnv<T extends Record<string, string | undefined>>(env: T): T {
  return {
    ...env,
    [POWERDIRECTOR_CLI_ENV_VAR]: POWERDIRECTOR_CLI_ENV_VALUE,
  };
}

export function ensurePowerDirectorExecMarkerOnProcess(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  env[POWERDIRECTOR_CLI_ENV_VAR] = POWERDIRECTOR_CLI_ENV_VALUE;
  return env;
}
