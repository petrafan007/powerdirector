import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { nostrPlugin } from "./src/channel";

export default defineSetupPluginEntry(nostrPlugin);
