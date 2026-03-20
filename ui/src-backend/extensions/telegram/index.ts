import type { ChannelPlugin } from "@/src-backend/plugin-sdk/core";
import { defineChannelPluginEntry } from "@/src-backend/plugin-sdk/core";
import { telegramPlugin } from "./src/channel";
import { setTelegramRuntime } from "./src/runtime";

export { telegramPlugin } from "./src/channel";
export { setTelegramRuntime } from "./src/runtime";

export default defineChannelPluginEntry({
  id: "telegram",
  name: "Telegram",
  description: "Telegram channel plugin",
  plugin: telegramPlugin as ChannelPlugin,
  setRuntime: setTelegramRuntime,
});
