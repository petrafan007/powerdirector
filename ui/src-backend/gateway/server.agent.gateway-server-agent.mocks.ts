import { vi } from "vitest";
import { createEmptyPluginRegistry, type PluginRegistry } from "../plugins/registry";
import { setActivePluginRegistry } from "../plugins/runtime";

export const registryState: { registry: PluginRegistry } = {
  registry: createEmptyPluginRegistry(),
};

export function setRegistry(registry: PluginRegistry) {
  registryState.registry = registry;
  setActivePluginRegistry(registry);
}

vi.mock("./server-plugins", async () => {
  const { setActivePluginRegistry } = await import("../plugins/runtime");
  return {
    loadGatewayPlugins: (params: { baseMethods: string[] }) => {
      setActivePluginRegistry(registryState.registry);
      return {
        pluginRegistry: registryState.registry,
        gatewayMethods: params.baseMethods ?? [],
      };
    },
    // server.impl.ts sets a fallback context before dispatch; tests only need the symbol to exist.
    setFallbackGatewayContext: vi.fn(),
  };
});
