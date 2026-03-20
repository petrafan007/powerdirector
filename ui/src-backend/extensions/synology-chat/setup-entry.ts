import { defineSetupPluginEntry } from "@/src-backend/plugin-sdk/core";
import { synologyChatPlugin } from "./src/channel";

export default defineSetupPluginEntry(synologyChatPlugin);
