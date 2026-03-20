import { runProviderPluginAuthMethod } from "../plugins/provider-auth-choice";
import {
  resolveProviderModelPickerEntries,
  resolveProviderPluginChoice,
  runProviderModelSelectedHook,
} from "../plugins/provider-wizard";
import { resolvePluginProviders } from "../plugins/providers";

export const modelPickerRuntime = {
  resolveProviderModelPickerEntries,
  resolveProviderPluginChoice,
  runProviderModelSelectedHook,
  resolvePluginProviders,
  runProviderPluginAuthMethod,
};
