import type { ChannelPlugin } from "@/src-backend/plugin-sdk/core";
import {
  resolveWhatsAppGroupIntroHint,
  resolveWhatsAppGroupRequireMention,
  resolveWhatsAppGroupToolPolicy,
} from "../api";
import { type ResolvedWhatsAppAccount } from "./accounts";
import { webAuthExists } from "./auth-store";
import { whatsappSetupAdapter } from "./setup-core";
import { createWhatsAppPluginBase, whatsappSetupWizardProxy } from "./shared";

export const whatsappSetupPlugin: ChannelPlugin<ResolvedWhatsAppAccount> = {
  ...createWhatsAppPluginBase({
    groups: {
      resolveRequireMention: resolveWhatsAppGroupRequireMention,
      resolveToolPolicy: resolveWhatsAppGroupToolPolicy,
      resolveGroupIntroHint: resolveWhatsAppGroupIntroHint,
    },
    setupWizard: whatsappSetupWizardProxy,
    setup: whatsappSetupAdapter,
    isConfigured: async (account) => await webAuthExists(account.authDir),
  }),
};
