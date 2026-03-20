import { logConfigUpdated } from "../../config/logging";
import { resolveAgentModelPrimaryValue } from "../../config/model-input";
import type { RuntimeEnv } from "../../runtime";
import { applyDefaultModelPrimaryUpdate, updateConfig } from "./shared";

export async function modelsSetCommand(modelRaw: string, runtime: RuntimeEnv) {
  const updated = await updateConfig((cfg) => {
    return applyDefaultModelPrimaryUpdate({ cfg, modelRaw, field: "model" });
  });

  logConfigUpdated(runtime);
  runtime.log(
    `Default model: ${resolveAgentModelPrimaryValue(updated.agents?.defaults?.model) ?? modelRaw}`,
  );
}
