import { defineSetupPluginEntry } from "powerdirector/plugin-sdk/core";
import { telegramSetupPlugin } from "./src/channel.setup";

export { telegramSetupPlugin } from "./src/channel.setup";

export default defineSetupPluginEntry(telegramSetupPlugin);
