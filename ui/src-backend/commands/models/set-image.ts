import { logConfigUpdated } from '../../config/logging';
import type { RuntimeEnv } from '../../runtime';
import { applyDefaultModelPrimaryUpdate, updateConfig } from './shared';

export async function modelsSetImageCommand(modelRaw: string, runtime: RuntimeEnv) {
  const updated = await updateConfig((cfg) => {
    return applyDefaultModelPrimaryUpdate({ cfg, modelRaw, field: "imageModel" });
  });

  logConfigUpdated(runtime);
  runtime.log(`Image model: ${updated.agents?.defaults?.imageModel?.primary ?? modelRaw}`);
}
