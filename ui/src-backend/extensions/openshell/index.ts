import type { PowerDirectorPluginApi } from "@/src-backend/plugin-sdk/core";
import { registerSandboxBackend } from "@/src-backend/plugin-sdk/sandbox";
import {
  createOpenShellSandboxBackendFactory,
  createOpenShellSandboxBackendManager,
} from "./src/backend";
import { createOpenShellPluginConfigSchema, resolveOpenShellPluginConfig } from "./src/config";

const plugin = {
  id: "openshell",
  name: "OpenShell Sandbox",
  description: "OpenShell-backed sandbox runtime for agent exec and file tools.",
  configSchema: createOpenShellPluginConfigSchema(),
  register(api: PowerDirectorPluginApi) {
    if (api.registrationMode !== "full") {
      return;
    }
    const pluginConfig = resolveOpenShellPluginConfig(api.pluginConfig);
    registerSandboxBackend("openshell", {
      factory: createOpenShellSandboxBackendFactory({
        pluginConfig,
      }),
      manager: createOpenShellSandboxBackendManager({
        pluginConfig,
      }),
    });
  },
};

export default plugin;
