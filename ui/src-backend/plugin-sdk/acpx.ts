// Public ACPX runtime backend helpers.
// Keep this surface narrow and limited to the ACP runtime/backend contract.

export type { AcpRuntimeErrorCode } from "../acp/runtime/errors";
export { AcpRuntimeError } from "../acp/runtime/errors";
export { registerAcpRuntimeBackend, unregisterAcpRuntimeBackend } from "../acp/runtime/registry";
export type {
  AcpRuntime,
  AcpRuntimeCapabilities,
  AcpRuntimeDoctorReport,
  AcpRuntimeEnsureInput,
  AcpRuntimeEvent,
  AcpRuntimeHandle,
  AcpRuntimeStatus,
  AcpRuntimeTurnInput,
  AcpSessionUpdateTag,
} from "../acp/runtime/types";
export type {
  PowerDirectorPluginApi,
  PowerDirectorPluginConfigSchema,
  PowerDirectorPluginService,
  PowerDirectorPluginServiceContext,
  PluginLogger,
} from "../plugins/types";
export type {
  WindowsSpawnProgram,
  WindowsSpawnProgramCandidate,
  WindowsSpawnResolution,
} from "./windows-spawn";
export {
  applyWindowsSpawnProgramPolicy,
  materializeWindowsSpawnProgram,
  resolveWindowsSpawnProgramCandidate,
} from "./windows-spawn";
export {
  listKnownProviderAuthEnvVarNames,
  omitEnvKeysCaseInsensitive,
} from "../secrets/provider-env-vars";
