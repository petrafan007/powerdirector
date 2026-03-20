import { type ResolvedSignalAccount } from "./accounts";
import { type ChannelPlugin } from "./runtime-api";
import { signalSetupAdapter } from "./setup-core";
import { createSignalPluginBase, signalSetupWizard } from "./shared";

export const signalSetupPlugin: ChannelPlugin<ResolvedSignalAccount> = {
  ...createSignalPluginBase({
    setupWizard: signalSetupWizard,
    setup: signalSetupAdapter,
  }),
};
