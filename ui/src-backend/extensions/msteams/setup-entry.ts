import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { msteamsPlugin } from "./src/channel";

export default defineSetupPluginEntry(msteamsPlugin);
