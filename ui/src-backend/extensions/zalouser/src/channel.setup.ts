import type { ChannelPlugin } from "../runtime-api";
import type { ResolvedZalouserAccount } from "./accounts";
import { zalouserSetupAdapter } from "./setup-core";
import { zalouserSetupWizard } from "./setup-surface";
import { createZalouserPluginBase } from "./shared";

export const zalouserSetupPlugin: ChannelPlugin<ResolvedZalouserAccount> = {
  ...createZalouserPluginBase({
    setupWizard: zalouserSetupWizard,
    setup: zalouserSetupAdapter,
  }),
};
