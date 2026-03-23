import { definePluginEntry } from "powerdirector/plugin-sdk/core";
import { createDiagnosticsOtelService } from "./src/service";

export default definePluginEntry({
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  register(api) {
    api.registerService(createDiagnosticsOtelService());
  },
});
