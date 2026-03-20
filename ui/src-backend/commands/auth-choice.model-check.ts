import { ensureAuthProfileStore, listProfilesForProvider } from "../agents/auth-profiles";
import { hasUsableCustomProviderApiKey, resolveEnvApiKey } from "../agents/model-auth";
import { loadModelCatalog } from "../agents/model-catalog";
import { resolveDefaultModelForAgent } from "../agents/model-selection";
import type { PowerDirectorConfig } from "../config/config";
import type { WizardPrompter } from "../wizard/prompts";
import { buildProviderAuthRecoveryHint } from "./provider-auth-guidance";

export async function warnIfModelConfigLooksOff(
  config: PowerDirectorConfig,
  prompter: WizardPrompter,
  options?: { agentId?: string; agentDir?: string },
) {
  const ref = resolveDefaultModelForAgent({
    cfg: config,
    agentId: options?.agentId,
  });
  const warnings: string[] = [];
  const catalog = await loadModelCatalog({
    config,
    useCache: false,
  });
  if (catalog.length > 0) {
    const known = catalog.some(
      (entry) => entry.provider === ref.provider && entry.id === ref.model,
    );
    if (!known) {
      warnings.push(
        `Model not found: ${ref.provider}/${ref.model}. Update agents.defaults.model or run /models list.`,
      );
    }
  }

  const store = ensureAuthProfileStore(options?.agentDir);
  const hasProfile = listProfilesForProvider(store, ref.provider).length > 0;
  const envKey = resolveEnvApiKey(ref.provider);
  const hasCustomKey = hasUsableCustomProviderApiKey(config, ref.provider);
  if (!hasProfile && !envKey && !hasCustomKey) {
    warnings.push(
      `No auth configured for provider "${ref.provider}". The agent may fail until credentials are added. ${buildProviderAuthRecoveryHint(
        {
          provider: ref.provider,
          config,
          includeEnvVar: true,
        },
      )}`,
    );
  }

  if (warnings.length > 0) {
    await prompter.note(warnings.join("\n"), "Model check");
  }
}
