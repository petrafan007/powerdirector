import { type ResolvedSlackAccount } from "./accounts";
import { type ChannelPlugin } from "./runtime-api";
import { slackSetupAdapter } from "./setup-core";
import { slackSetupWizard } from "./setup-surface";
import { createSlackPluginBase } from "./shared";

export const slackSetupPlugin: ChannelPlugin<ResolvedSlackAccount> = {
  ...createSlackPluginBase({
    setupWizard: slackSetupWizard,
    setup: slackSetupAdapter,
  }),
};
