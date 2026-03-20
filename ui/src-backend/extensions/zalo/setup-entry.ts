import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { zaloPlugin } from "./src/channel";

export default defineSetupPluginEntry(zaloPlugin);
