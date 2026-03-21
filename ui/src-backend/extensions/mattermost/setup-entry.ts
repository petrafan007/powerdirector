import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { mattermostPlugin } from "./src/channel";

export default defineSetupPluginEntry(mattermostPlugin);
