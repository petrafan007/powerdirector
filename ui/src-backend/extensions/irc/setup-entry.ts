import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { ircPlugin } from "./src/channel";

export default defineSetupPluginEntry(ircPlugin);
