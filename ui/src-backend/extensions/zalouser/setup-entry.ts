import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { zalouserSetupPlugin } from "./src/channel.setup";

export { zalouserSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(zalouserSetupPlugin);
