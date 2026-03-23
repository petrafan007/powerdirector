import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { imessageSetupPlugin } from "./src/channel.setup";

export { imessageSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(imessageSetupPlugin);
