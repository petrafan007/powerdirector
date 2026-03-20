import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { discordSetupPlugin } from "./src/channel.setup";

export { discordSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(discordSetupPlugin);
