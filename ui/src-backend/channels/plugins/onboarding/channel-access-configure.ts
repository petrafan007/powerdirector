import type { PowerDirectorConfig } from "../../../config/config";
import type { WizardPrompter } from "../../../wizard/prompts";
import { promptChannelAccessConfig, type ChannelAccessPolicy } from "./channel-access";

export async function configureChannelAccessWithAllowlist<TResolved>(params: {
  cfg: PowerDirectorConfig;
  prompter: WizardPrompter;
  label: string;
  currentPolicy: ChannelAccessPolicy;
  currentEntries: string[];
  placeholder: string;
  updatePrompt: boolean;
  setPolicy: (cfg: PowerDirectorConfig, policy: ChannelAccessPolicy) => PowerDirectorConfig;
  resolveAllowlist: (params: { cfg: PowerDirectorConfig; entries: string[] }) => Promise<TResolved>;
  applyAllowlist: (params: { cfg: PowerDirectorConfig; resolved: TResolved }) => PowerDirectorConfig;
}): Promise<PowerDirectorConfig> {
  let next = params.cfg;
  const accessConfig = await promptChannelAccessConfig({
    prompter: params.prompter,
    label: params.label,
    currentPolicy: params.currentPolicy,
    currentEntries: params.currentEntries,
    placeholder: params.placeholder,
    updatePrompt: params.updatePrompt,
  });
  if (!accessConfig) {
    return next;
  }
  if (accessConfig.policy !== "allowlist") {
    return params.setPolicy(next, accessConfig.policy);
  }
  const resolved = await params.resolveAllowlist({
    cfg: next,
    entries: accessConfig.entries,
  });
  next = params.setPolicy(next, "allowlist");
  return params.applyAllowlist({
    cfg: next,
    resolved,
  });
}
