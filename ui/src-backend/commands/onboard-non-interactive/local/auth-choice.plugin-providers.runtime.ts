import { resolveProviderPluginChoice } from "../../../plugins/provider-wizard";
import {
  resolveOwningPluginIdsForProvider,
  resolvePluginProviders,
} from "../../../plugins/providers";

export const authChoicePluginProvidersRuntime = {
  resolveOwningPluginIdsForProvider,
  resolveProviderPluginChoice,
  resolvePluginProviders,
};
