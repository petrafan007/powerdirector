import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { bluebubblesSetupPlugin } from "./src/channel.setup";

export { bluebubblesSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(bluebubblesSetupPlugin);
