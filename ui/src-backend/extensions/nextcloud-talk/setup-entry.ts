import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { nextcloudTalkPlugin } from "./src/channel";

export default defineSetupPluginEntry(nextcloudTalkPlugin);
