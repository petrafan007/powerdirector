import path from "node:path";
import {
  definePluginEntry,
  resolvePreferredPowerDirectorTmpDir,
  type PowerDirectorPluginApi,
} from "./api";
import {
  diffsPluginConfigSchema,
  resolveDiffsPluginDefaults,
  resolveDiffsPluginSecurity,
} from "./src/config";
import { createDiffsHttpHandler } from "./src/http";
import { DIFFS_AGENT_GUIDANCE } from "./src/prompt-guidance";
import { DiffArtifactStore } from "./src/store";
import { createDiffsTool } from "./src/tool";

export default definePluginEntry({
  id: "diffs",
  name: "Diffs",
  description: "Read-only diff viewer and PNG/PDF renderer for agents.",
  configSchema: diffsPluginConfigSchema,
  register(api: PowerDirectorPluginApi) {
    const defaults = resolveDiffsPluginDefaults(api.pluginConfig);
    const security = resolveDiffsPluginSecurity(api.pluginConfig);
    const store = new DiffArtifactStore({
      rootDir: path.join(resolvePreferredPowerDirectorTmpDir(), "powerdirector-diffs"),
      logger: api.logger,
    });

    api.registerTool((ctx) => createDiffsTool({ api, store, defaults, context: ctx }), {
      name: "diffs",
    });
    api.registerHttpRoute({
      path: "/plugins/diffs",
      auth: "plugin",
      match: "prefix",
      handler: createDiffsHttpHandler({
        store,
        logger: api.logger,
        allowRemoteViewer: security.allowRemoteViewer,
      }),
    });
    api.on("before_prompt_build", async () => ({
      prependSystemContext: DIFFS_AGENT_GUIDANCE,
    }));
  },
});
