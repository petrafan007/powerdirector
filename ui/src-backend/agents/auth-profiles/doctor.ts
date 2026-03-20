import type { PowerDirectorConfig } from "../../config/config";
import { normalizeProviderId } from "../model-selection";
import type { AuthProfileStore } from "./types";

let providerRuntimePromise:
  | Promise<typeof import("../../plugins/provider-runtime.runtime")>
  | undefined;

function loadProviderRuntime() {
  providerRuntimePromise ??= import("../../plugins/provider-runtime.runtime");
  return providerRuntimePromise;
}

export async function formatAuthDoctorHint(params: {
  cfg?: PowerDirectorConfig;
  store: AuthProfileStore;
  provider: string;
  profileId?: string;
}): Promise<string> {
  const normalizedProvider = normalizeProviderId(params.provider);
  const { buildProviderAuthDoctorHintWithPlugin } = await loadProviderRuntime();
  const pluginHint = await buildProviderAuthDoctorHintWithPlugin({
    provider: normalizedProvider,
    context: {
      config: params.cfg,
      store: params.store,
      provider: normalizedProvider,
      profileId: params.profileId,
    },
  });
  if (typeof pluginHint === "string" && pluginHint.trim()) {
    return pluginHint;
  }
  return "";
}
