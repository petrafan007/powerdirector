// Public ACP runtime helpers for plugins that integrate with ACP control/session state.

export { getAcpSessionManager } from "../acp/control-plane/manager";
export { AcpRuntimeError, isAcpRuntimeError } from "../acp/runtime/errors";
export type { AcpRuntimeErrorCode } from "../acp/runtime/errors";
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
export { readAcpSessionEntry } from "../acp/runtime/session-meta";
export type { AcpSessionStoreEntry } from "../acp/runtime/session-meta";
