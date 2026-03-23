import { defineChannelPluginEntry } from "powerdirector/plugin-sdk/core";
import type { AnyAgentTool } from "./runtime-api";
import { zalouserPlugin } from "./src/channel";
import { setZalouserRuntime } from "./src/runtime";
import { ZalouserToolSchema, executeZalouserTool } from "./src/tool";

export { zalouserPlugin } from "./src/channel";
export { setZalouserRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "zalouser",
  name: "Zalo Personal",
  description: "Zalo personal account messaging via native zca-js integration",
  plugin: zalouserPlugin,
  setRuntime: setZalouserRuntime,
  registerFull(api) {
    api.registerTool({
      name: "zalouser",
      label: "Zalo Personal",
      description:
        "Send messages and access data via Zalo personal account. " +
        "Actions: send (text message), image (send image URL), link (send link), " +
        "friends (list/search friends), groups (list groups), me (profile info), status (auth check).",
      parameters: ZalouserToolSchema,
      execute: executeZalouserTool,
    } as AnyAgentTool);
  },
});
