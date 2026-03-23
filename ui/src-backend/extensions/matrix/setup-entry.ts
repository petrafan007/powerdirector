import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { matrixPlugin } from "./src/channel";

export default defineSetupPluginEntry(matrixPlugin);
