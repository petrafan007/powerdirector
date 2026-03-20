import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { ircPlugin } from "./src/channel";

export default defineSetupPluginEntry(ircPlugin);
