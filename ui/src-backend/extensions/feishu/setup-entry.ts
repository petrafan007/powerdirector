import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { feishuPlugin } from "./src/channel";

export default defineSetupPluginEntry(feishuPlugin);
