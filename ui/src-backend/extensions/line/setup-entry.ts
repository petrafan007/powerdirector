import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { lineSetupPlugin } from "./src/channel.setup";

export { lineSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(lineSetupPlugin);
