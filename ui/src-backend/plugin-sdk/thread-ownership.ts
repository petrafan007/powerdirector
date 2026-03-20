// Narrow plugin-sdk surface for the bundled thread-ownership plugin.
// Keep this list additive and scoped to symbols used under extensions/thread-ownership.

export { definePluginEntry } from "./core";
export type { PowerDirectorConfig } from "../config/config";
export type { PowerDirectorPluginApi } from "../plugins/types";
