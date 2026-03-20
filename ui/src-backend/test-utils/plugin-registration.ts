import { createCapturedPluginRegistration } from "../plugins/captured-registration";
import type { PowerDirectorPluginApi, ProviderPlugin } from "../plugins/types";

export { createCapturedPluginRegistration };

type RegistrablePlugin = {
  register(api: PowerDirectorPluginApi): void;
};

export function registerSingleProviderPlugin(params: {
  register(api: PowerDirectorPluginApi): void;
}): ProviderPlugin {
  const captured = createCapturedPluginRegistration();
  params.register(captured.api);
  const provider = captured.providers[0];
  if (!provider) {
    throw new Error("provider registration missing");
  }
  return provider;
}

export function registerProviderPlugins(...plugins: RegistrablePlugin[]): ProviderPlugin[] {
  const captured = createCapturedPluginRegistration();
  for (const plugin of plugins) {
    plugin.register(captured.api);
  }
  return captured.providers;
}

export function requireRegisteredProvider(providers: ProviderPlugin[], providerId: string) {
  const provider = providers.find((entry) => entry.id === providerId);
  if (!provider) {
    throw new Error(`provider ${providerId} missing`);
  }
  return provider;
}
