import { definePluginEntry } from "powerdirector/plugin-sdk/core";
import type { AnyAgentTool, PowerDirectorPluginApi, PowerDirectorPluginToolFactory } from "./runtime-api";
import { createLobsterTool } from "./src/lobster-tool";

export default definePluginEntry({
  id: "lobster",
  name: "Lobster",
  description: "Optional local shell helper tools",
  register(api: PowerDirectorPluginApi) {
    api.registerTool(
      ((ctx) => {
        if (ctx.sandboxed) {
          return null;
        }
        return createLobsterTool(api) as AnyAgentTool;
      }) as PowerDirectorPluginToolFactory,
      { optional: true },
    );
  },
});
