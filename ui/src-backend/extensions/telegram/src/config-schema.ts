import { buildChannelConfigSchema, TelegramConfigSchema } from "@/src-backend/plugin-sdk/telegram-core";

export const TelegramChannelConfigSchema = buildChannelConfigSchema(TelegramConfigSchema);
