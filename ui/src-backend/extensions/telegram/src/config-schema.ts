import { buildChannelConfigSchema, TelegramConfigSchema } from "powerdirector/plugin-sdk/telegram-core";

export const TelegramChannelConfigSchema = buildChannelConfigSchema(TelegramConfigSchema);
