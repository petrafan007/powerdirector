import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { slackSetupPlugin } from "./src/channel.setup";

export { slackSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(slackSetupPlugin);
