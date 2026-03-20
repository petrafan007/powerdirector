// Narrow plugin-sdk surface for the bundled diagnostics-otel plugin.
// Keep this list additive and scoped to symbols used under extensions/diagnostics-otel.

export type { DiagnosticEventPayload } from "../infra/diagnostic-events";
export { emitDiagnosticEvent, onDiagnosticEvent } from "../infra/diagnostic-events";
export { registerLogTransport } from "../logging/logger";
export { redactSensitiveText } from "../logging/redact";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type {
  PowerDirectorPluginApi,
  PowerDirectorPluginService,
  PowerDirectorPluginServiceContext,
} from "../plugins/types";
