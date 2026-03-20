import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { googlechatPlugin } from "./src/channel";

export default defineSetupPluginEntry(googlechatPlugin);
