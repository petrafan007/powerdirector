import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { mattermostPlugin } from "./src/channel";

export default defineSetupPluginEntry(mattermostPlugin);
