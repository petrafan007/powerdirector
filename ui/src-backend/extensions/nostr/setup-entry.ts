import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { nostrPlugin } from "./src/channel";

export default defineSetupPluginEntry(nostrPlugin);
