import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { matrixPlugin } from "./src/channel";

export default defineSetupPluginEntry(matrixPlugin);
