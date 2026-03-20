import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { tlonPlugin } from "./src/channel";

export default defineSetupPluginEntry(tlonPlugin);
