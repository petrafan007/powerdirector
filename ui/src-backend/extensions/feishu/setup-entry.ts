import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { feishuPlugin } from "./src/channel";

export default defineSetupPluginEntry(feishuPlugin);
