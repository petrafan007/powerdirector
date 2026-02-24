import type { PowerDirectorPluginApi } from "powerdirector/plugin-sdk";
import { emptyPluginConfigSchema } from "powerdirector/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: PowerDirectorPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
