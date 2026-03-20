import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { whatsappSetupPlugin } from "./src/channel.setup";

export { whatsappSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(whatsappSetupPlugin);
