import type { PowerDirectorPluginApi } from "./runtime-api";
import { createAcpxPluginConfigSchema } from "./src/config";
import { createAcpxRuntimeService } from "./src/service";

const plugin = {
  id: "acpx",
  name: "ACPX Runtime",
  description: "ACP runtime backend powered by the acpx CLI.",
  configSchema: createAcpxPluginConfigSchema(),
  register(api: PowerDirectorPluginApi) {
    api.registerService(
      createAcpxRuntimeService({
        pluginConfig: api.pluginConfig,
      }),
    );
  },
};

export default plugin;
