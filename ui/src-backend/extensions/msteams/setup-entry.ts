import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { msteamsPlugin } from "./src/channel";

export default defineSetupPluginEntry(msteamsPlugin);
