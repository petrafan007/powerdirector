import {
  resolveProviderPluginChoice as resolveProviderPluginChoiceImpl,
  runProviderModelSelectedHook as runProviderModelSelectedHookImpl,
} from "./provider-wizard";
import { resolvePluginProviders as resolvePluginProvidersImpl } from "./providers";

type ResolveProviderPluginChoice =
  typeof import("./provider-wizard").resolveProviderPluginChoice;
type RunProviderModelSelectedHook =
  typeof import("./provider-wizard").runProviderModelSelectedHook;
type ResolvePluginProviders = typeof import("./providers").resolvePluginProviders;

export function resolveProviderPluginChoice(
  ...args: Parameters<ResolveProviderPluginChoice>
): ReturnType<ResolveProviderPluginChoice> {
  return resolveProviderPluginChoiceImpl(...args);
}

export function runProviderModelSelectedHook(
  ...args: Parameters<RunProviderModelSelectedHook>
): ReturnType<RunProviderModelSelectedHook> {
  return runProviderModelSelectedHookImpl(...args);
}

export function resolvePluginProviders(
  ...args: Parameters<ResolvePluginProviders>
): ReturnType<ResolvePluginProviders> {
  return resolvePluginProvidersImpl(...args);
}
