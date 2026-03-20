import { slackSetupWizard as slackSetupWizardImpl } from "./setup-surface";

type SlackSetupWizard = typeof import("./setup-surface").slackSetupWizard;

export const slackSetupWizard: SlackSetupWizard = { ...slackSetupWizardImpl };
