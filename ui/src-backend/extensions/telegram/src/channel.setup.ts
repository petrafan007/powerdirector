import { type ChannelPlugin } from "../runtime-api";
import { type ResolvedTelegramAccount } from "./accounts";
import type { TelegramProbe } from "./probe";
import { telegramSetupAdapter } from "./setup-core";
import { telegramSetupWizard } from "./setup-surface";
import { createTelegramPluginBase } from "./shared";

export const telegramSetupPlugin: ChannelPlugin<ResolvedTelegramAccount, TelegramProbe> = {
  ...createTelegramPluginBase({
    setupWizard: telegramSetupWizard,
    setup: telegramSetupAdapter,
  }),
};
