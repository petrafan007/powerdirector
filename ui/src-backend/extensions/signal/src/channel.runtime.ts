import { signalSetupWizard as signalSetupWizardImpl } from "./setup-surface";

type SignalSetupWizard = typeof import("./setup-surface").signalSetupWizard;

export const signalSetupWizard: SignalSetupWizard = { ...signalSetupWizardImpl };
