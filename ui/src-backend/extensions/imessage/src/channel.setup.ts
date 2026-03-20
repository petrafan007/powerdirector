import { type ChannelPlugin } from "../runtime-api";
import { type ResolvedIMessageAccount } from "./accounts";
import { imessageSetupAdapter } from "./setup-core";
import { createIMessagePluginBase, imessageSetupWizard } from "./shared";

export const imessageSetupPlugin: ChannelPlugin<ResolvedIMessageAccount> = {
  ...createIMessagePluginBase({
    setupWizard: imessageSetupWizard,
    setup: imessageSetupAdapter,
  }),
};
