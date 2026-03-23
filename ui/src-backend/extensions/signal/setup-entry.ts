import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { signalSetupPlugin } from "./src/channel.setup";

export { signalSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(signalSetupPlugin);
