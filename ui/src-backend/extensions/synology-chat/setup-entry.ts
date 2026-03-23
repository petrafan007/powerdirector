import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { synologyChatPlugin } from "./src/channel";

export default defineSetupPluginEntry(synologyChatPlugin);
