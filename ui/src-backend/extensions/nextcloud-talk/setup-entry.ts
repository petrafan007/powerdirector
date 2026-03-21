import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { nextcloudTalkPlugin } from "./src/channel";

export default defineSetupPluginEntry(nextcloudTalkPlugin);
