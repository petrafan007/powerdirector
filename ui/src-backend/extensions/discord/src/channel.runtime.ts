import { discordSetupWizard as discordSetupWizardImpl } from "./setup-surface";

type DiscordSetupWizard = typeof import("./setup-surface").discordSetupWizard;

export const discordSetupWizard: DiscordSetupWizard = { ...discordSetupWizardImpl };
