import { ALLOWED_LOG_LEVELS, type LogLevel, tryParseLogLevel } from "./levels";
import { loggingState } from "./state";

export function resolveEnvLogLevelOverride(): LogLevel | undefined {
  const raw = process.env.POWERDIRECTOR_LOG_LEVEL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    loggingState.invalidEnvLogLevelValue = null;
    return undefined;
  }
  const parsed = tryParseLogLevel(trimmed);
  if (parsed) {
    loggingState.invalidEnvLogLevelValue = null;
    return parsed;
  }
  if (loggingState.invalidEnvLogLevelValue !== trimmed) {
    loggingState.invalidEnvLogLevelValue = trimmed;
    process.stderr.write(
      `[powerdirector] Ignoring invalid POWERDIRECTOR_LOG_LEVEL="${trimmed}" (allowed: ${ALLOWED_LOG_LEVELS.join("|")}).\n`,
    );
  }
  return undefined;
}
